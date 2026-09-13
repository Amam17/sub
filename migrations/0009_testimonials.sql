-- =========================================================
-- SubShare — Testimonials
-- Depends on: 0001_initial_schema.sql
-- =========================================================

create type testimonial_status as enum ('pending', 'approved', 'rejected');

create table testimonials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  subscription_id uuid references subscriptions (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  review text not null,
  status testimonial_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index idx_testimonials_status on testimonials (status);

alter table testimonials enable row level security;

create policy testimonials_select_own on testimonials
  for select using (user_id = auth.uid() or is_staff());
create policy testimonials_insert_own on testimonials
  for insert with check (user_id = auth.uid());
create policy testimonials_staff_moderate on testimonials
  for update using (is_staff()) with check (is_staff());

-- Public marketing pages read approved testimonials via the
-- service-role client (server components), which bypasses RLS —
-- no anon-facing select policy is needed for that path.
