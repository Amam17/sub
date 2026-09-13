-- =========================================================
-- SubShare — Initial Database Schema
-- Target: PostgreSQL 15+ (Supabase)
-- =========================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================

create type user_role as enum ('customer', 'support', 'operator', 'admin', 'super_admin');
create type user_status as enum ('unverified', 'active', 'suspended', 'blocked');

create type service_status as enum ('draft', 'active', 'paused', 'unavailable', 'archived');
create type plan_status as enum ('draft', 'active', 'paused', 'archived');

create type access_delivery_type as enum (
  'seat_invitation', 'existing_account', 'account_creation_link',
  'license_key', 'voucher_code', 'manual_delivery'
);
create type access_delivery_status as enum (
  'pending', 'processing', 'active', 'failed', 'expired', 'cancelled'
);

create type pool_status as enum (
  'draft', 'provisioning', 'ready', 'active', 'full',
  'expiring', 'expired', 'paused', 'closed'
);
create type pool_health_status as enum ('healthy', 'warning', 'critical', 'offline', 'unknown');
create type identity_type as enum (
  'email_account', 'email_alias', 'organization', 'provider_account',
  'api_entitlement', 'license_inventory', 'voucher_inventory', 'other'
);
create type provisioning_method as enum ('automatic', 'admin_assisted', 'manual');

create type reservation_status as enum ('reserved', 'confirmed', 'released', 'expired');

create type order_payment_status as enum (
  'pending_payment', 'payment_processing', 'payment_confirmed', 'failed', 'refunded'
);
create type order_fulfilment_status as enum (
  'fulfilment_pending', 'fulfilment_in_progress', 'active', 'expired', 'cancelled', 'failed'
);
create type payment_status as enum ('started', 'pending', 'verified', 'failed', 'refunded');

create type subscription_status as enum (
  'pending', 'active', 'expiring', 'expired', 'cancelled', 'suspended'
);
create type continuity_lock_status as enum ('none', 'requested', 'active', 'released', 'ineligible');

create type license_status as enum ('available', 'reserved', 'assigned', 'revoked');
create type voucher_status as enum ('available', 'reserved', 'assigned', 'redeemed', 'expired');

create type automation_task_status as enum ('pending', 'processing', 'completed', 'failed', 'requires_review');
create type admin_task_status as enum ('pending', 'in_progress', 'completed', 'cancelled');

create type notification_channel as enum ('in_app', 'email', 'sms', 'whatsapp', 'push');
create type notification_status as enum ('unread', 'read', 'archived');

create type support_category as enum ('payment', 'access', 'renewal', 'account', 'technical', 'other');
create type support_status as enum ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed');

-- =========================================================
-- CORE IDENTITY
-- =========================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  country text,
  role user_role not null default 'customer',
  status user_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- CATALOG
-- =========================================================

create table service_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references service_categories (id),
  logo_url text,
  status service_status not null default 'draft',
  access_delivery_type access_delivery_type not null,
  pool_required boolean not null default true,
  renewal_rules jsonb not null default '{}',
  continuity_lock_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table plans (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null,
  currency text not null default 'NGN',
  billing_period text not null,
  duration_days integer not null,
  status plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- POOL / CAPACITY ENGINE
-- =========================================================

create table pools (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services (id) on delete cascade,
  pool_number integer not null,
  name text not null,
  status pool_status not null default 'draft',
  total_capacity integer not null check (total_capacity >= 0),
  used_capacity integer not null default 0 check (used_capacity >= 0),
  reserved_capacity integer not null default 0 check (reserved_capacity >= 0),
  available_capacity integer generated always as
    (total_capacity - used_capacity - reserved_capacity) stored,
  utilization_threshold numeric(5, 2) not null default 80.00,
  health_status pool_health_status not null default 'unknown',
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, pool_number),
  constraint pool_capacity_within_total check (used_capacity + reserved_capacity <= total_capacity)
);

create table pool_identities (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references pools (id) on delete cascade,
  provider text not null,
  identity_type identity_type not null,
  identity_reference text,
  external_identity_id text,
  status text not null default 'pending',
  provisioning_method provisioning_method not null default 'manual',
  -- Never store raw secrets here; this only points at an entry in a secrets manager / vault.
  credential_secret_reference text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pool_memberships (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references pools (id) on delete cascade,
  subscription_id uuid, -- FK added after subscriptions table exists
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create table capacity_reservations (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references pools (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  order_id uuid, -- FK added after orders table exists
  quantity integer not null default 1 check (quantity > 0),
  status reservation_status not null default 'reserved',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- ORDERS / PAYMENTS
-- =========================================================

create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  service_id uuid not null references services (id),
  plan_id uuid not null references plans (id),
  price numeric(12, 2) not null,
  currency text not null default 'NGN',
  payment_status order_payment_status not null default 'pending_payment',
  fulfilment_status order_fulfilment_status not null default 'fulfilment_pending',
  start_date timestamptz,
  expiry_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table capacity_reservations
  add constraint capacity_reservations_order_id_fkey
  foreign key (order_id) references orders (id) on delete set null;

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  provider text not null,
  provider_reference text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'NGN',
  status payment_status not null default 'started',
  verified_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

-- =========================================================
-- SUBSCRIPTIONS / ACCESS DELIVERY
-- =========================================================

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  service_id uuid not null references services (id),
  plan_id uuid not null references plans (id),
  pool_id uuid references pools (id),
  order_id uuid not null references orders (id),
  status subscription_status not null default 'pending',
  starts_at timestamptz,
  expires_at timestamptz,
  auto_renew boolean not null default false,
  continuity_lock_status continuity_lock_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pool_memberships
  add constraint pool_memberships_subscription_id_fkey
  foreign key (subscription_id) references subscriptions (id) on delete cascade;

create table access_deliveries (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  delivery_type access_delivery_type not null,
  status access_delivery_status not null default 'pending',
  access_reference text,
  delivery_data jsonb not null default '{}',
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table licenses (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services (id) on delete cascade,
  plan_id uuid references plans (id),
  license_key_reference text not null, -- pointer to encrypted value, never plaintext
  status license_status not null default 'available',
  assigned_to_subscription_id uuid references subscriptions (id),
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vouchers (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services (id) on delete cascade,
  plan_id uuid references plans (id),
  code_hash text not null, -- store a hash, never plaintext
  status voucher_status not null default 'available',
  assigned_to_subscription_id uuid references subscriptions (id),
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table waitlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  plan_id uuid references plans (id),
  created_at timestamptz not null default now(),
  unique (user_id, service_id, plan_id)
);

-- =========================================================
-- AUTOMATION / ADMIN OPERATIONS
-- =========================================================

create table automation_tasks (
  id uuid primary key default uuid_generate_v4(),
  task_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  status automation_task_status not null default 'pending',
  priority integer not null default 5,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_tasks (
  id uuid primary key default uuid_generate_v4(),
  task_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  title text not null,
  instructions text,
  status admin_task_status not null default 'pending',
  priority integer not null default 5,
  assigned_to uuid references profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table pool_health_checks (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references pools (id) on delete cascade,
  health_status pool_health_status not null,
  capacity_status text,
  entitlement_status text,
  provider_status text,
  expiry_status text,
  details jsonb not null default '{}',
  checked_at timestamptz not null default now()
);

create table pool_events (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references pools (id) on delete cascade,
  event_type text not null,
  event_source text not null default 'system',
  status text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- =========================================================
-- NOTIFICATIONS / SUPPORT / AUDIT
-- =========================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  channel notification_channel not null default 'in_app',
  category text not null,
  title text not null,
  message text not null,
  status notification_status not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table email_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles (id) on delete set null,
  to_email text not null,
  template text not null,
  status text not null default 'queued',
  provider_reference text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  category support_category not null default 'other',
  subject text not null,
  status support_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table support_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references support_tickets (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  sender_role user_role not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================

create index idx_services_status on services (status);
create index idx_plans_service_id on plans (service_id);
create index idx_pools_service_status on pools (service_id, status);
create index idx_pool_identities_pool_id on pool_identities (pool_id);
create index idx_pool_memberships_pool_id on pool_memberships (pool_id);
create index idx_pool_memberships_user_id on pool_memberships (user_id);
create index idx_capacity_reservations_expiry on capacity_reservations (status, expires_at);
create index idx_capacity_reservations_pool_id on capacity_reservations (pool_id);
create index idx_orders_user_id on orders (user_id);
create index idx_payments_order_id on payments (order_id);
create index idx_subscriptions_user_id on subscriptions (user_id);
create index idx_subscriptions_expiry on subscriptions (status, expires_at);
create index idx_access_deliveries_subscription_id on access_deliveries (subscription_id);
create index idx_licenses_service_status on licenses (service_id, status);
create index idx_vouchers_service_status on vouchers (service_id, status);
create index idx_automation_tasks_status_schedule on automation_tasks (status, scheduled_at);
create index idx_admin_tasks_status on admin_tasks (status);
create index idx_pool_events_pool_id on pool_events (pool_id, created_at);
create index idx_notifications_user_status on notifications (user_id, status);
create index idx_support_tickets_user_id on support_tickets (user_id);
create index idx_support_messages_ticket_id on support_messages (ticket_id);
create index idx_audit_logs_target on audit_logs (target_type, target_id);

-- =========================================================
-- HELPER FUNCTION FOR RLS
-- =========================================================

create or replace function is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('support', 'operator', 'admin', 'super_admin')
  );
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table profiles enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table subscriptions enable row level security;
alter table access_deliveries enable row level security;
alter table capacity_reservations enable row level security;
alter table notifications enable row level security;
alter table support_tickets enable row level security;
alter table support_messages enable row level security;
alter table waitlists enable row level security;
alter table pool_memberships enable row level security;

-- Admin/operator-only tables: no customer-facing policy at all (default deny,
-- access only via service_role from server-side code).
alter table pools enable row level security;
alter table pool_identities enable row level security;
alter table licenses enable row level security;
alter table vouchers enable row level security;
alter table automation_tasks enable row level security;
alter table admin_tasks enable row level security;
alter table pool_health_checks enable row level security;
alter table pool_events enable row level security;
alter table audit_logs enable row level security;
alter table system_settings enable row level security;

-- profiles: users see/update their own row; staff can see all
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or is_staff());
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- orders
create policy orders_select_own on orders
  for select using (user_id = auth.uid() or is_staff());

-- payments
create policy payments_select_own on payments
  for select using (user_id = auth.uid() or is_staff());

-- subscriptions
create policy subscriptions_select_own on subscriptions
  for select using (user_id = auth.uid() or is_staff());

-- access_deliveries
create policy access_deliveries_select_own on access_deliveries
  for select using (user_id = auth.uid() or is_staff());

-- capacity_reservations
create policy capacity_reservations_select_own on capacity_reservations
  for select using (user_id = auth.uid() or is_staff());

-- notifications
create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- support tickets and messages
create policy support_tickets_select_own on support_tickets
  for select using (user_id = auth.uid() or is_staff());
create policy support_tickets_insert_own on support_tickets
  for insert with check (user_id = auth.uid());
create policy support_messages_select_own on support_messages
  for select using (
    is_staff() or exists (
      select 1 from support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

-- waitlists
create policy waitlists_select_own on waitlists
  for select using (user_id = auth.uid() or is_staff());
create policy waitlists_insert_own on waitlists
  for insert with check (user_id = auth.uid());

-- pool_memberships: customers can see their own membership row (never other members)
create policy pool_memberships_select_own on pool_memberships
  for select using (user_id = auth.uid() or is_staff());

-- Admin-only tables: staff-only select, writes restricted to admin
create policy pools_staff_select on pools for select using (is_staff());
create policy pools_admin_write on pools for all using (is_admin()) with check (is_admin());

create policy pool_identities_admin_only on pool_identities
  for all using (is_admin()) with check (is_admin());

create policy licenses_admin_only on licenses
  for all using (is_admin()) with check (is_admin());

create policy vouchers_admin_only on vouchers
  for all using (is_admin()) with check (is_admin());

create policy automation_tasks_staff_select on automation_tasks
  for select using (is_staff());
create policy automation_tasks_admin_write on automation_tasks
  for all using (is_admin()) with check (is_admin());

create policy admin_tasks_staff on admin_tasks
  for all using (is_staff()) with check (is_staff());

create policy pool_health_checks_staff_select on pool_health_checks
  for select using (is_staff());

create policy pool_events_staff_select on pool_events
  for select using (is_staff());

create policy audit_logs_admin_select on audit_logs
  for select using (is_admin());

create policy system_settings_admin_only on system_settings
  for all using (is_admin()) with check (is_admin());

-- =========================================================
-- END OF INITIAL SCHEMA
-- =========================================================
