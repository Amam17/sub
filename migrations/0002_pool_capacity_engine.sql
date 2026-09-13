-- =========================================================
-- SubShare — Pool / Capacity Engine
-- Depends on: 0001_initial_schema.sql
-- =========================================================

-- ---------------------------------------------------------
-- 1. find_eligible_pool
-- Selection priority (per spec):
--   1. Active pool with capacity
--   2. Ready pool
--   3. (Provisioning of a next pool is triggered separately
--      by the threshold check, not by this function)
-- Never assigns randomly — lowest pool_number with capacity wins.
-- ---------------------------------------------------------
create or replace function find_eligible_pool(
  p_service_id uuid,
  p_quantity integer default 1
)
returns uuid
language sql
stable
as $$
  select id from pools
  where service_id = p_service_id
    and status in ('active', 'ready')
    and available_capacity >= p_quantity
  order by
    case status when 'active' then 0 else 1 end,
    pool_number asc
  limit 1;
$$;

-- ---------------------------------------------------------
-- 2. reserve_capacity
-- Locks the pool row to prevent race conditions between
-- concurrent checkouts, then reserves capacity for a
-- short-lived window (default 15 minutes) while payment
-- is completed.
-- ---------------------------------------------------------
create or replace function reserve_capacity(
  p_pool_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_quantity integer default 1,
  p_ttl_minutes integer default 15
)
returns capacity_reservations
language plpgsql
as $$
declare
  v_pool pools%rowtype;
  v_reservation capacity_reservations%rowtype;
begin
  -- Lock the pool row so concurrent reservations can't both
  -- pass the capacity check at once.
  select * into v_pool from pools where id = p_pool_id for update;

  if not found then
    raise exception 'POOL_NOT_FOUND: %', p_pool_id;
  end if;

  if v_pool.status not in ('active', 'ready') then
    raise exception 'POOL_NOT_AVAILABLE: pool % has status %', p_pool_id, v_pool.status;
  end if;

  if v_pool.available_capacity < p_quantity then
    raise exception 'INSUFFICIENT_CAPACITY: pool % has % available, % requested',
      p_pool_id, v_pool.available_capacity, p_quantity;
  end if;

  update pools
  set reserved_capacity = reserved_capacity + p_quantity,
      updated_at = now()
  where id = p_pool_id;

  insert into capacity_reservations (
    pool_id, service_id, user_id, order_id, quantity, status, expires_at
  ) values (
    p_pool_id, v_pool.service_id, p_user_id, p_order_id, p_quantity,
    'reserved', now() + make_interval(mins => p_ttl_minutes)
  )
  returning * into v_reservation;

  insert into pool_events (pool_id, event_type, event_source, status, payload)
  values (p_pool_id, 'capacity_reserved', 'system', 'success',
    jsonb_build_object('reservation_id', v_reservation.id, 'quantity', p_quantity));

  perform check_pool_threshold(p_pool_id);

  return v_reservation;
end;
$$;

-- ---------------------------------------------------------
-- 3. release_reservation
-- Returns reserved capacity to the pool. Used both for
-- explicit cancellation and for expiry cleanup.
-- ---------------------------------------------------------
create or replace function release_reservation(
  p_reservation_id uuid,
  p_new_status reservation_status default 'released'
)
returns void
language plpgsql
as $$
declare
  v_reservation capacity_reservations%rowtype;
begin
  select * into v_reservation from capacity_reservations
  where id = p_reservation_id for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND: %', p_reservation_id;
  end if;

  if v_reservation.status <> 'reserved' then
    -- Already confirmed, released, or expired — nothing to do.
    return;
  end if;

  update pools
  set reserved_capacity = greatest(0, reserved_capacity - v_reservation.quantity),
      updated_at = now()
  where id = v_reservation.pool_id;

  update capacity_reservations
  set status = p_new_status, updated_at = now()
  where id = p_reservation_id;

  insert into pool_events (pool_id, event_type, event_source, status, payload)
  values (v_reservation.pool_id,
    case p_new_status when 'expired' then 'capacity_expired' else 'capacity_released' end,
    'system', 'success',
    jsonb_build_object('reservation_id', p_reservation_id, 'quantity', v_reservation.quantity));
end;
$$;

-- ---------------------------------------------------------
-- 4. expire_stale_reservations
-- Scheduled job entry point. Finds reservations past their
-- expiry window and releases their capacity.
-- ---------------------------------------------------------
create or replace function expire_stale_reservations()
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select id from capacity_reservations
    where status = 'reserved' and expires_at < now()
    for update skip locked
  loop
    perform release_reservation(v_row.id, 'expired');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------
-- 5. complete_purchase
-- The core "payment verified" transaction. Idempotent on
-- order_id: calling it twice for the same order is a no-op
-- the second time (guards against duplicate webhooks).
-- Confirms the reservation, creates the subscription, adds
-- the pool membership, updates pool capacity, and queues the
-- access-delivery record. Notification/automation dispatch
-- is left to the caller via the returned subscription id.
-- ---------------------------------------------------------
create or replace function complete_purchase(
  p_order_id uuid,
  p_reservation_id uuid,
  p_starts_at timestamptz default now(),
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
as $$
declare
  v_order orders%rowtype;
  v_reservation capacity_reservations%rowtype;
  v_service services%rowtype;
  v_existing_subscription_id uuid;
  v_subscription_id uuid;
  v_computed_expiry timestamptz;
begin
  -- Idempotency guard: if a subscription already exists for this order, stop.
  select id into v_existing_subscription_id
  from subscriptions where order_id = p_order_id
  limit 1;

  if v_existing_subscription_id is not null then
    return v_existing_subscription_id;
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND: %', p_order_id;
  end if;

  select * into v_reservation from capacity_reservations
  where id = p_reservation_id for update;
  if not found then
    raise exception 'RESERVATION_NOT_FOUND: %', p_reservation_id;
  end if;

  if v_reservation.status <> 'reserved' then
    raise exception 'RESERVATION_NOT_ACTIVE: reservation % has status %',
      p_reservation_id, v_reservation.status;
  end if;

  select * into v_service from services where id = v_order.service_id;

  v_computed_expiry := coalesce(p_expires_at, v_order.expiry_date);

  -- Confirm the reservation: move capacity from reserved to used.
  update pools
  set reserved_capacity = greatest(0, reserved_capacity - v_reservation.quantity),
      used_capacity = used_capacity + v_reservation.quantity,
      updated_at = now()
  where id = v_reservation.pool_id;

  update capacity_reservations
  set status = 'confirmed', updated_at = now()
  where id = p_reservation_id;

  -- Create the subscription.
  insert into subscriptions (
    user_id, service_id, plan_id, pool_id, order_id,
    status, starts_at, expires_at, auto_renew
  ) values (
    v_order.user_id, v_order.service_id, v_order.plan_id, v_reservation.pool_id, p_order_id,
    'active', p_starts_at, v_computed_expiry, false
  )
  returning id into v_subscription_id;

  -- Pool membership.
  insert into pool_memberships (pool_id, subscription_id, user_id, status)
  values (v_reservation.pool_id, v_subscription_id, v_order.user_id, 'active');

  -- Queue the access delivery according to the service's configured method.
  insert into access_deliveries (subscription_id, user_id, delivery_type, status)
  values (v_subscription_id, v_order.user_id, v_service.access_delivery_type, 'pending');

  -- Order bookkeeping.
  update orders
  set payment_status = 'payment_confirmed',
      fulfilment_status = 'fulfilment_pending',
      start_date = p_starts_at,
      expiry_date = v_computed_expiry,
      updated_at = now()
  where id = p_order_id;

  insert into pool_events (pool_id, event_type, event_source, status, payload)
  values (v_reservation.pool_id, 'capacity_confirmed', 'system', 'success',
    jsonb_build_object('subscription_id', v_subscription_id, 'order_id', p_order_id));

  -- If the manual-delivery path is used, drop an admin task automatically.
  if v_service.access_delivery_type = 'manual_delivery' then
    insert into admin_tasks (task_type, entity_type, entity_id, title, instructions, status, priority)
    values ('manual_fulfilment', 'access_delivery', v_subscription_id,
      'Complete manual fulfilment for ' || v_service.name,
      'Payment confirmed for order ' || p_order_id || '. Complete the provider-approved activation step.',
      'pending', 5);
  end if;

  perform check_pool_threshold(v_reservation.pool_id);

  return v_subscription_id;
end;
$$;

-- ---------------------------------------------------------
-- 6. check_pool_threshold
-- Evaluates utilization against the pool's configured
-- threshold. If crossed and no successor pool exists yet,
-- logs the event and queues a provisioning task rather than
-- provisioning automatically (provisioning often needs a
-- real operational identity — see pool_identities).
-- ---------------------------------------------------------
create or replace function check_pool_threshold(p_pool_id uuid)
returns void
language plpgsql
as $$
declare
  v_pool pools%rowtype;
  v_utilization numeric;
  v_next_exists boolean;
begin
  select * into v_pool from pools where id = p_pool_id;
  if not found then
    return;
  end if;

  if v_pool.total_capacity = 0 then
    return;
  end if;

  v_utilization := (v_pool.used_capacity + v_pool.reserved_capacity)::numeric
    / v_pool.total_capacity * 100;

  if v_pool.used_capacity + v_pool.reserved_capacity >= v_pool.total_capacity
     and v_pool.status <> 'full' then
    update pools set status = 'full', updated_at = now() where id = p_pool_id;
    insert into pool_events (pool_id, event_type, event_source, status)
    values (p_pool_id, 'pool_full', 'system', 'success');
  end if;

  if v_utilization >= v_pool.utilization_threshold then
    select exists (
      select 1 from pools
      where service_id = v_pool.service_id
        and pool_number = v_pool.pool_number + 1
    ) into v_next_exists;

    if not v_next_exists then
      insert into pool_events (pool_id, event_type, event_source, status, payload)
      values (p_pool_id, 'threshold_reached', 'system', 'success',
        jsonb_build_object('utilization', v_utilization));

      -- Avoid spamming duplicate tasks if this runs repeatedly before
      -- the task is picked up.
      if not exists (
        select 1 from automation_tasks
        where task_type = 'provision_next_pool'
          and entity_type = 'service'
          and entity_id = v_pool.service_id
          and status in ('pending', 'processing')
      ) then
        insert into automation_tasks (task_type, entity_type, entity_id, status, priority, metadata)
        values ('provision_next_pool', 'service', v_pool.service_id, 'pending', 3,
          jsonb_build_object('triggered_by_pool_id', p_pool_id, 'utilization', v_utilization));
      end if;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------
-- 7. cancel_subscription
-- Releases pool capacity when a subscription ends (cancel,
-- expiry, or downgrade), so the pool reflects real availability.
-- ---------------------------------------------------------
create or replace function cancel_subscription(
  p_subscription_id uuid,
  p_new_status subscription_status default 'cancelled'
)
returns void
language plpgsql
as $$
declare
  v_sub subscriptions%rowtype;
begin
  select * into v_sub from subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND: %', p_subscription_id;
  end if;

  if v_sub.status in ('cancelled', 'expired') then
    return;
  end if;

  if v_sub.pool_id is not null then
    update pools
    set used_capacity = greatest(0, used_capacity - 1),
        updated_at = now()
    where id = v_sub.pool_id;

    update pool_memberships
    set status = 'inactive', left_at = now()
    where subscription_id = p_subscription_id and status = 'active';

    -- A pool that was full may now have room again.
    update pools
    set status = 'active'
    where id = v_sub.pool_id and status = 'full';
  end if;

  update subscriptions
  set status = p_new_status, updated_at = now()
  where id = p_subscription_id;

  if v_sub.pool_id is not null then
    insert into pool_events (pool_id, event_type, event_source, status, payload)
    values (v_sub.pool_id, 'capacity_released', 'system', 'success',
      jsonb_build_object('subscription_id', p_subscription_id, 'reason', p_new_status));
  end if;
end;
$$;
