-- =========================================================
-- SubShare — Analytics Events
-- Depends on: 0001_initial_schema.sql
-- =========================================================

create table analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  user_id uuid references profiles (id) on delete set null,
  service_id uuid references services (id) on delete set null,
  plan_id uuid references plans (id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_analytics_events_type_created on analytics_events (event_type, created_at);
create index idx_analytics_events_service on analytics_events (service_id);

alter table analytics_events enable row level security;

create policy analytics_events_staff_select on analytics_events
  for select using (is_staff());

-- Inserts happen exclusively via the service-role client from
-- server code, so no customer-facing insert policy is defined.
