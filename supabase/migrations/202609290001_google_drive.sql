-- Drive is opt-in and has its own lifecycle; never revoke the shared Google grant per feature.
alter table public.google_oauth_states add column purpose text not null default 'calendar'
  check (purpose in ('calendar', 'drive'));

create table public.google_drive_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  google_sub text not null,
  email text not null,
  refresh_cipher text,
  status text not null default 'connected' check (status in ('connected','reconnect','disconnected')),
  version uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.google_drive_connections enable row level security;
revoke all on public.google_drive_connections from anon, authenticated;
grant all on public.google_drive_connections to service_role;

alter table public.project_materials add column drive_file_id text,
  add column drive_account text;
alter table public.project_materials add constraint project_materials_drive_reference
  check (drive_file_id is null or (kind = 'link' and file_path is null and drive_account is not null));
create unique index project_materials_drive_unique
  on public.project_materials(owner_id, project_id, drive_account, drive_file_id);

create table public.project_drive_folders (
  project_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  drive_account text not null,
  file_id text not null,
  name text not null,
  url text not null,
  foreign key(project_id, owner_id) references public.projects(id, owner_id) on delete cascade
);
alter table public.project_drive_folders enable row level security;
revoke all on public.project_drive_folders from anon, authenticated;
grant all on public.project_drive_folders to service_role;

-- Server-only limiter. Picker browser calls must also be limited in Google Cloud quotas.
create table public.google_drive_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  requests integer not null,
  primary key(owner_id, day)
);
alter table public.google_drive_usage enable row level security;
revoke all on public.google_drive_usage from anon, authenticated;
grant all on public.google_drive_usage to service_role;
create function public.reserve_drive_request(p_owner uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
  insert into public.google_drive_usage(owner_id, day, requests)
  values(p_owner, (now() at time zone 'UTC')::date, 1)
  on conflict(owner_id, day) do update set requests=public.google_drive_usage.requests+1
    where public.google_drive_usage.requests < 200
  returning requests into total;
  return total is not null;
end $$;
revoke all on function public.reserve_drive_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_drive_request(uuid) to service_role;
