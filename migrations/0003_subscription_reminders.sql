-- =========================================================
-- SubShare — Subscription Reminder Tracking
-- Depends on: 0001_initial_schema.sql
-- =========================================================

create table subscription_expiry_reminders (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions (id) on delete cascade,
  days_before integer not null, -- 7, 3, 1, or 0
  sent_at timestamptz not null default now(),
  unique (subscription_id, days_before)
);

alter table subscription_expiry_reminders enable row level security;

create policy subscription_expiry_reminders_staff_only on subscription_expiry_reminders
  for all using (is_staff()) with check (is_staff());
