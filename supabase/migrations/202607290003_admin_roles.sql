-- Admin authorization foundation.
-- The app reads these fields to protect /admin routes.
-- Sensitive changes to role/status/plan must be done from trusted SQL/API contexts.

alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists status text not null default 'active',
  add column if not exists plan text not null default 'free';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_status_check check (status in ('active', 'blocked', 'pending')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_plan_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'starter', 'pro', 'ai')) not valid;
  end if;
end $$;

alter table public.profiles validate constraint profiles_role_check;
alter table public.profiles validate constraint profiles_status_check;
alter table public.profiles validate constraint profiles_plan_check;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_plan_idx on public.profiles (plan);

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id and (
    new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.plan is distinct from old.plan
  ) then
    raise exception 'profile privilege fields are admin managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_self_update on public.profiles;

create trigger profiles_prevent_privilege_self_update
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_self_update();

comment on column public.profiles.role is 'Application role. user/admin. Admin managed only.';
comment on column public.profiles.status is 'Account status. active/blocked/pending. Admin managed only.';
comment on column public.profiles.plan is 'Commercial plan. free/starter/pro/ai. Admin managed only.';
