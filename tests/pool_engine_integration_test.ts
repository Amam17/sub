// tests/pool-engine.integration.test.ts
//
// Run against a real Postgres database with migrations 0001-0008
// applied (a local Supabase instance or a disposable test DB) —
// these functions do row locking and check constraints that a
// mocked client can't meaningfully exercise.
//
// Usage:
//   TEST_DATABASE_URL=postgres://... npx vitest run tests/pool-engine.integration.test.ts
//
// Each test creates its own service/plan/pool/user fixtures and
// cleans up after itself so tests can run in any order.

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Client } from "pg";
import { randomUUID } from "crypto";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const maybeDescribe = TEST_DATABASE_URL ? describe : describe.skip;

maybeDescribe("pool capacity engine (integration)", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  async function createFixtures(totalCapacity: number) {
    const userId = randomUUID();
    const serviceId = randomUUID();
    const planId = randomUUID();
    const poolId = randomUUID();

    // auth.users row is required for the profiles FK in a real
    // Supabase project; local test DBs without auth schema can
    // stub this table — adjust to match your test environment.
    await client.query(
      `insert into auth.users (id, email) values ($1, $2) on conflict do nothing`,
      [userId, `${userId}@example.test`]
    );
    await client.query(
      `insert into profiles (id, full_name, email, role, status) values ($1, 'Test User', $2, 'customer', 'active')`,
      [userId, `${userId}@example.test`]
    );
    await client.query(
      `insert into services (id, name, slug, access_delivery_type, status) values ($1, 'Test Service', $2, 'manual_delivery', 'active')`,
      [serviceId, `test-service-${serviceId}`]
    );
    await client.query(
      `insert into plans (id, service_id, name, price, currency, billing_period, duration_days, status)
       values ($1, $2, 'Monthly', 1000, 'NGN', 'monthly', 30, 'active')`,
      [planId, serviceId]
    );
    await client.query(
      `insert into pools (id, service_id, pool_number, name, status, total_capacity)
       values ($1, $2, 1, 'Pool 1', 'active', $3)`,
      [poolId, serviceId, totalCapacity]
    );

    return { userId, serviceId, planId, poolId };
  }

  async function createOrder(userId: string, serviceId: string, planId: string) {
    const orderId = randomUUID();
    await client.query(
      `insert into orders (id, user_id, service_id, plan_id, price, currency)
       values ($1, $2, $3, $4, 1000, 'NGN')`,
      [orderId, userId, serviceId, planId]
    );
    return orderId;
  }

  afterEach(async () => {
    // Cascade deletes handle almost everything via FKs to services/users.
    await client.query(`delete from services where name = 'Test Service'`);
    await client.query(`delete from profiles where full_name = 'Test User'`);
  });

  it("prevents overbooking under concurrent reservations", async () => {
    const { userId, serviceId, planId, poolId } = await createFixtures(1);

    const orderA = await createOrder(userId, serviceId, planId);
    const orderB = await createOrder(userId, serviceId, planId);

    const results = await Promise.allSettled([
      client.query(`select reserve_capacity($1, $2, $3, 1, 15)`, [poolId, userId, orderA]),
      client.query(`select reserve_capacity($1, $2, $3, 1, 15)`, [poolId, userId, orderB]),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const pool = await client.query(`select reserved_capacity, available_capacity from pools where id = $1`, [
      poolId,
    ]);
    expect(pool.rows[0].reserved_capacity).toBe(1);
    expect(pool.rows[0].available_capacity).toBe(0);
  });

  it("complete_purchase is idempotent for the same order", async () => {
    const { userId, serviceId, planId, poolId } = await createFixtures(5);
    const orderId = await createOrder(userId, serviceId, planId);

    const reservation = await client.query(
      `select * from reserve_capacity($1, $2, $3, 1, 15)`,
      [poolId, userId, orderId]
    );
    const reservationId = reservation.rows[0].id;

    const first = await client.query(`select complete_purchase($1, $2)`, [orderId, reservationId]);
    const second = await client.query(`select complete_purchase($1, $2)`, [orderId, reservationId]);

    expect(first.rows[0].complete_purchase).toBe(second.rows[0].complete_purchase);

    const subCount = await client.query(`select count(*) from subscriptions where order_id = $1`, [
      orderId,
    ]);
    expect(Number(subCount.rows[0].count)).toBe(1);

    const pool = await client.query(`select used_capacity, reserved_capacity from pools where id = $1`, [
      poolId,
    ]);
    expect(pool.rows[0].used_capacity).toBe(1);
    expect(pool.rows[0].reserved_capacity).toBe(0);
  });

  it("release_reservation returns capacity to the pool", async () => {
    const { userId, serviceId, planId, poolId } = await createFixtures(3);
    const orderId = await createOrder(userId, serviceId, planId);

    const reservation = await client.query(
      `select * from reserve_capacity($1, $2, $3, 1, 15)`,
      [poolId, userId, orderId]
    );
    const reservationId = reservation.rows[0].id;

    await client.query(`select release_reservation($1, 'released')`, [reservationId]);

    const pool = await client.query(`select reserved_capacity, available_capacity from pools where id = $1`, [
      poolId,
    ]);
    expect(pool.rows[0].reserved_capacity).toBe(0);
    expect(pool.rows[0].available_capacity).toBe(3);
  });

  it("expire_stale_reservations releases only past-TTL reservations", async () => {
    const { userId, serviceId, planId, poolId } = await createFixtures(2);
    const orderId = await createOrder(userId, serviceId, planId);

    // TTL of -1 minute so it's already expired.
    const reservation = await client.query(
      `select * from reserve_capacity($1, $2, $3, 1, -1)`,
      [poolId, userId, orderId]
    );
    const reservationId = reservation.rows[0].id;

    const result = await client.query(`select expire_stale_reservations()`);
    expect(Number(result.rows[0].expire_stale_reservations)).toBeGreaterThanOrEqual(1);

    const status = await client.query(`select status from capacity_reservations where id = $1`, [
      reservationId,
    ]);
    expect(status.rows[0].status).toBe("expired");
  });

  it("rejects reservations exceeding available capacity", async () => {
    const { userId, serviceId, planId, poolId } = await createFixtures(1);
    const orderId = await createOrder(userId, serviceId, planId);

    await expect(
      client.query(`select reserve_capacity($1, $2, $3, 5, 15)`, [poolId, userId, orderId])
    ).rejects.toThrow(/INSUFFICIENT_CAPACITY/);
  });
});
