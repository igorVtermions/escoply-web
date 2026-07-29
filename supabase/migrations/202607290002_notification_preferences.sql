-- User-level notification preferences and read/dismissal state for computed notifications.

create table if not exists public.notification_preferences (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  daily_reminders boolean not null default true,
  upcoming_deadlines boolean not null default true,
  overdue_payments boolean not null default true,
  pending_budgets boolean not null default true,
  recurring_obligations boolean not null default true,
  weekly_summary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_states (
  owner_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('deadline', 'payment', 'budget')),
  source_id uuid not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, source, source_id)
);

create index if not exists notification_states_owner_source_idx
on public.notification_states (owner_id, source, dismissed_at, read_at);

alter table public.notification_preferences enable row level security;
alter table public.notification_states enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_preferences'
      and policyname = 'Users can read own notification preferences'
  ) then
    create policy "Users can read own notification preferences"
    on public.notification_preferences
    for select
    to authenticated
    using ((select auth.uid()) = owner_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_preferences'
      and policyname = 'Users can write own notification preferences'
  ) then
    create policy "Users can write own notification preferences"
    on public.notification_preferences
    for all
    to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_states'
      and policyname = 'Users can read own notification states'
  ) then
    create policy "Users can read own notification states"
    on public.notification_states
    for select
    to authenticated
    using ((select auth.uid()) = owner_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_states'
      and policyname = 'Users can write own notification states'
  ) then
    create policy "Users can write own notification states"
    on public.notification_states
    for all
    to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
  end if;
end $$;

grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.notification_states to authenticated;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists notification_states_set_updated_at on public.notification_states;
create trigger notification_states_set_updated_at
before update on public.notification_states
for each row
execute function public.set_updated_at();
