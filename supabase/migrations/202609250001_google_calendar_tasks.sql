-- Manual Google integration. Credentials and synchronization metadata are server-only.
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 180),
  description text not null default '' check (char_length(description) <= 8000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  start_date date,
  end_date date,
  reminders jsonb not null default '{"useDefault":false,"overrides":[]}',
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (not all_day or (start_date is not null and end_date > start_date))
);
create index calendar_events_owner_start on public.calendar_events(owner_id, starts_at);
alter table public.calendar_events enable row level security;
create policy calendar_events_owner on public.calendar_events for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.calendar_events to authenticated;
create trigger calendar_events_updated before update on public.calendar_events for each row execute function public.set_updated_at();

-- Keep Google-only task fields without assigning fictitious dates to undated tasks.
alter table public.reminders add column google_notes text not null default '',
  add column google_undated boolean not null default false;

create table public.google_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  google_sub text not null,
  email text not null,
  refresh_cipher text,
  calendar_id text,
  tasklist_id text,
  status text not null default 'connected' check (status in ('connected','reconnect','disconnected')),
  last_sync_at timestamptz,
  last_message text,
  lock_id uuid,
  lock_until timestamptz,
  last_attempt_at timestamptz,
  cursor_event uuid,
  cursor_task uuid,
  created_at timestamptz not null default now()
);
create table public.google_oauth_states (
  state_hash text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  verifier_cipher text not null,
  expires_at timestamptz not null
);
create table public.google_sync_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.google_connections(owner_id) on delete cascade,
  kind text not null check (kind in ('event','task')),
  local_id uuid not null,
  remote_id text,
  baseline jsonb,
  remote_snapshot jsonb,
  issue text,
  resolution text check (resolution in ('local','remote','delete')),
  resolution_local jsonb,
  resolution_remote jsonb,
  insertion_pending boolean not null default false,
  unique(owner_id,kind,local_id),
  unique(owner_id,kind,remote_id)
);
do $$ declare t text; begin
  foreach t in array array['google_connections','google_oauth_states','google_sync_links'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

-- A single lease serializes callback, disconnect, sync and conflict resolutions per user.
create function public.acquire_google_lock(p_owner uuid, p_lock uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.google_connections set lock_id=p_lock, lock_until=now()+interval '3 minutes', last_attempt_at=now()
  where owner_id=p_owner and (lock_until is null or lock_until < now())
    and (last_attempt_at is null or last_attempt_at < now()-interval '10 seconds');
  return found;
end $$;
revoke all on function public.acquire_google_lock(uuid,uuid) from public, anon, authenticated;
grant execute on function public.acquire_google_lock(uuid,uuid) to service_role;

-- Conservative project-wide daily ceiling for the free testing phase.
create table public.google_daily_usage (day date primary key, requests integer not null default 0);
alter table public.google_daily_usage enable row level security;
revoke all on public.google_daily_usage from anon, authenticated;
grant all on public.google_daily_usage to service_role;
create function public.reserve_google_requests(p_count integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
  if p_count < 1 or p_count > 100 then return false; end if;
  insert into public.google_daily_usage(day,requests) values ((now() at time zone 'UTC')::date,p_count)
  on conflict(day) do update set requests=public.google_daily_usage.requests+excluded.requests
  where public.google_daily_usage.requests+excluded.requests <= 10000
  returning requests into total;
  return total is not null;
end $$;
revoke all on function public.reserve_google_requests(integer) from public, anon, authenticated;
grant execute on function public.reserve_google_requests(integer) to service_role;
