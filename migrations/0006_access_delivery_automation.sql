-- =========================================================
-- SubShare — Access Delivery Automation
-- Depends on: 0001_initial_schema.sql, 0002_pool_capacity_engine.sql
-- =========================================================

-- ---------------------------------------------------------
-- assign_access_delivery
-- Dispatches by delivery type immediately after a subscription
-- is created. license_key/voucher_code are fully automatic here
-- (atomic claim of an unused unit — never assigned twice).
-- The invite-style types (seat_invitation, account_creation_link,
-- existing_account) need an external action (send an email,
-- call a provider API, or read customer-supplied account info),
-- so they're queued as automation_tasks instead of being faked
-- as complete. manual_delivery is handled separately by
-- complete_purchase via admin_tasks, as before.
-- ---------------------------------------------------------
create or replace function assign_access_delivery(
  p_access_delivery_id uuid,
  p_subscription_id uuid,
  p_service_id uuid,
  p_plan_id uuid,
  p_user_id uuid,
  p_delivery_type access_delivery_type
)
returns void
language plpgsql
as $$
declare
  v_license licenses%rowtype;
  v_voucher vouchers%rowtype;
begin
  if p_delivery_type = 'license_key' then
    select * into v_license from licenses
    where service_id = p_service_id
      and status = 'available'
      and (plan_id is null or plan_id = p_plan_id)
    order by created_at asc
    for update skip locked
    limit 1;

    if not found then
      -- Out of stock: escalate rather than silently leaving the
      -- customer without access after they've paid.
      insert into admin_tasks (task_type, entity_type, entity_id, title, instructions, status, priority)
      values ('license_stock_exhausted', 'access_delivery', p_access_delivery_id,
        'No available license for service',
        'Customer paid but no unused license is in stock. Add inventory and assign manually.',
        'pending', 1);
      return;
    end if;

    update licenses
    set status = 'assigned',
        assigned_to_subscription_id = p_subscription_id,
        assigned_at = now(),
        updated_at = now()
    where id = v_license.id;

    update access_deliveries
    set status = 'active',
        access_reference = v_license.license_key_reference,
        activated_at = now()
    where id = p_access_delivery_id;

  elsif p_delivery_type = 'voucher_code' then
    select * into v_voucher from vouchers
    where service_id = p_service_id
      and status = 'available'
      and (plan_id is null or plan_id = p_plan_id)
    order by created_at asc
    for update skip locked
    limit 1;

    if not found then
      insert into admin_tasks (task_type, entity_type, entity_id, title, instructions, status, priority)
      values ('voucher_stock_exhausted', 'access_delivery', p_access_delivery_id,
        'No available voucher for service',
        'Customer paid but no unused voucher is in stock. Add inventory and assign manually.',
        'pending', 1);
      return;
    end if;

    update vouchers
    set status = 'assigned',
        assigned_to_subscription_id = p_subscription_id,
        assigned_at = now(),
        updated_at = now()
    where id = v_voucher.id;

    update access_deliveries
    set status = 'active',
        access_reference = v_voucher.code_hash,
        activated_at = now()
    where id = p_access_delivery_id;

  elsif p_delivery_type in ('seat_invitation', 'account_creation_link', 'existing_account') then
    update access_deliveries
    set status = 'processing'
    where id = p_access_delivery_id;

    insert into automation_tasks (task_type, entity_type, entity_id, status, priority, metadata)
    values (
      case p_delivery_type
        when 'seat_invitation' then 'send_seat_invitation'
        when 'account_creation_link' then 'send_account_creation_link'
        else 'request_existing_account_info'
      end,
      'access_delivery', p_access_delivery_id, 'pending', 4,
      jsonb_build_object('subscription_id', p_subscription_id, 'user_id', p_user_id)
    );

  -- manual_delivery: left as 'pending' — complete_purchase already
  -- creates the admin_task for it.
  end if;
end;
$$;

-- ---------------------------------------------------------
-- complete_purchase (replaces the version from 0002) — now
-- calls assign_access_delivery right after the access_deliveries
-- row is created.
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
  v_access_delivery_id uuid;
  v_computed_expiry timestamptz;
begin
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

  update pools
  set reserved_capacity = greatest(0, reserved_capacity - v_reservation.quantity),
      used_capacity = used_capacity + v_reservation.quantity,
      updated_at = now()
  where id = v_reservation.pool_id;

  update capacity_reservations
  set status = 'confirmed', updated_at = now()
  where id = p_reservation_id;

  insert into subscriptions (
    user_id, service_id, plan_id, pool_id, order_id,
    status, starts_at, expires_at, auto_renew
  ) values (
    v_order.user_id, v_order.service_id, v_order.plan_id, v_reservation.pool_id, p_order_id,
    'active', p_starts_at, v_computed_expiry, false
  )
  returning id into v_subscription_id;

  insert into pool_memberships (pool_id, subscription_id, user_id, status)
  values (v_reservation.pool_id, v_subscription_id, v_order.user_id, 'active');

  insert into access_deliveries (subscription_id, user_id, delivery_type, status)
  values (v_subscription_id, v_order.user_id, v_service.access_delivery_type, 'pending')
  returning id into v_access_delivery_id;

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

  if v_service.access_delivery_type = 'manual_delivery' then
    insert into admin_tasks (task_type, entity_type, entity_id, title, instructions, status, priority)
    values ('manual_fulfilment', 'access_delivery', v_subscription_id,
      'Complete manual fulfilment for ' || v_service.name,
      'Payment confirmed for order ' || p_order_id || '. Complete the provider-approved activation step.',
      'pending', 5);
  else
    perform assign_access_delivery(
      v_access_delivery_id, v_subscription_id, v_order.service_id,
      v_order.plan_id, v_order.user_id, v_service.access_delivery_type
    );
  end if;

  perform check_pool_threshold(v_reservation.pool_id);

  return v_subscription_id;
end;
$$;
