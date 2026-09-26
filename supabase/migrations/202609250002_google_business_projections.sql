-- Calendar projections never mutate their business source.
create table public.google_business_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.google_connections(owner_id) on delete cascade,
  source_type text not null check (source_type in ('project','budget','payment','obligation')),
  source_id uuid not null,
  remote_id text not null,
  baseline jsonb,
  remote_snapshot jsonb,
  issue text,
  paused boolean not null default false,
  resolution boolean not null default false,
  resolution_local jsonb,
  resolution_remote jsonb,
  unique(owner_id,source_type,source_id),
  unique(owner_id,remote_id)
);
alter table public.google_business_links enable row level security;
revoke all on public.google_business_links from anon, authenticated;
grant all on public.google_business_links to service_role;
