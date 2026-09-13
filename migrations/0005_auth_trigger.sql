-- =========================================================
-- SubShare — Auth → Profile Sync
-- Depends on: 0001_initial_schema.sql
-- =========================================================

-- Without this, a new auth.users row has no matching profiles
-- row, which breaks every RLS check, role check, and notify()
-- call that assumes profiles exists for every authenticated user.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, status, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when new.email_confirmed_at is not null then 'active' else 'unverified' end,
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep profiles.status in sync when a user verifies their email
-- after the fact (Supabase updates auth.users.email_confirmed_at).
create or replace function handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
    set status = 'active', updated_at = now()
    where id = new.id and status = 'unverified';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute function handle_user_email_confirmed();
