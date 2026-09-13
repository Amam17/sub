-- =========================================================
-- SubShare — Renewals
-- Depends on: 0001_initial_schema.sql, 0002_pool_capacity_engine.sql
-- =========================================================

alter table orders
  add column order_type text not null default 'new'
    check (order_type in ('new', 'renewal'));

alter table orders
  add column renewal_subscription_id uuid references subscriptions (id);

-- ---------------------------------------------------------
-- renew_subscription
-- Mirrors complete_purchase but extends an existing subscription
-- instead of creating a new row, so a customer's continuity
-- (including continuity_lock_status) is preserved across renewal.
-- Idempotent on order_id, same as complete_purchase.
-- ---------------------------------------------------------
create or replace function renew_subscription(
  p_order_id uuid,
  p_reservation_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_order orders%rowtype;
  v_reservation capacity_reservations%rowtype;
  v_subscription subscriptions%rowtype;
  v_plan plans%rowtype;
  v_new_expiry timestamptz;
  v_already_processed boolean;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND: %', p_order_id;
  end if;

  if v_order.renewal_subscription_id is null then
    raise exception 'ORDER_MISSING_RENEWAL_TARGET: %', p_order_id;
  end if;

  -- Idempotency: if this order already moved the subscription's
  -- expiry forward, don't do it twice.
  select payment_status = 'payment_confirmed' into v_already_processed
  from orders where id = p_order_id;

  if v_already_processed then
    return v_order.renewal_subscription_id;
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

  select * into v_subscription from subscriptions
  where id = v_order.renewal_subscription_id for update;
  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND: %', v_order.renewal_subscription_id;
  end if;

  select * into v_plan from plans where id = v_order.plan_id;

  -- Confirm the reservation (may be the same pool the customer was
  -- already in, or a different one if their original pool is gone).
  update pools
  set reserved_capacity = greatest(0, reserved_capacity - v_reservation.quantity),
      used_capacity = used_capacity + v_reservation.quantity,
      updated_at = now()
  where id = v_reservation.pool_id;

  update capacity_reservations
  set status = 'confirmed', updated_at = now()
  where id = p_reservation_id;

  -- If the customer moved to a different pool for this renewal,
  -- release their capacity in the old pool and update membership.
  if v_subscription.pool_id is distinct from v_reservation.pool_id then
    if v_subscription.pool_id is not null then
      update pools
      set used_capacity = greatest(0, used_capacity - 1),
          updated_at = now()
      where id = v_subscription.pool_id;

      update pool_memberships
      set status = 'inactive', left_at = now()
      where subscription_id = v_subscription.id and status = 'active';
    end if;

    insert into pool_memberships (pool_id, subscription_id, user_id, status)
    values (v_reservation.pool_id, v_subscription.id, v_subscription.user_id, 'active');
  end if;

  v_new_expiry := greatest(v_subscription.expires_at, now())
    + make_interval(days => v_plan.duration_days);

  update subscriptions
  set status = 'active',
      pool_id = v_reservation.pool_id,
      expires_at = v_new_expiry,
      updated_at = now()
  where id = v_subscription.id;

  update orders
  set payment_status = 'payment_confirmed',
      fulfilment_status = 'active',
      start_date = now(),
      expiry_date = v_new_expiry,
      updated_at = now()
  where id = p_order_id;

  insert into pool_events (pool_id, event_type, event_source, status, payload)
  values (v_reservation.pool_id, 'renewal_completed', 'system', 'success',
    jsonb_build_object('subscription_id', v_subscription.id, 'order_id', p_order_id));

  perform check_pool_threshold(v_reservation.pool_id);

  return v_subscription.id;
end;
$$;
