-- Project detail modules: scope checklist, approvals and materials.

create table public.project_scope_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null,
  position smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_scope_items_title_length check (char_length(title) between 2 and 180),
  constraint project_scope_items_position_check check (position >= 0),
  constraint project_scope_items_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id)
    on delete cascade
);

create table public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'review')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_approvals_title_length check (char_length(title) between 2 and 180),
  constraint project_approvals_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id)
    on delete cascade
);

create table public.project_materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  kind text not null default 'link' check (kind in ('file', 'link', 'note')),
  title text not null,
  url text,
  file_path text,
  file_size bigint,
  mime_type text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_materials_title_length check (char_length(title) between 2 and 180),
  constraint project_materials_file_size_check check (file_size is null or file_size > 0),
  constraint project_materials_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id)
    on delete cascade
);

create index project_scope_items_owner_project_idx on public.project_scope_items (owner_id, project_id, position);
create index project_approvals_owner_project_idx on public.project_approvals (owner_id, project_id, created_at);
create index project_materials_owner_project_idx on public.project_materials (owner_id, project_id, created_at);

alter table public.project_scope_items enable row level security;
alter table public.project_approvals enable row level security;
alter table public.project_materials enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['project_scope_items', 'project_approvals', 'project_materials']
  loop
    execute format('create policy "Users can read own %1$s" on public.%1$I for select to authenticated using ((select auth.uid()) = owner_id)', table_name);
    execute format('create policy "Users can create own %1$s" on public.%1$I for insert to authenticated with check ((select auth.uid()) = owner_id)', table_name);
    execute format('create policy "Users can update own %1$s" on public.%1$I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', table_name);
    execute format('create policy "Users can delete own %1$s" on public.%1$I for delete to authenticated using ((select auth.uid()) = owner_id)', table_name);
    execute format('grant select, insert, update, delete on table public.%1$I to authenticated', table_name);
    execute format('create trigger %1$I_set_updated_at before update on public.%1$I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-materials',
  'project-materials',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own project materials"
on storage.objects for select to authenticated
using (bucket_id = 'project-materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload own project materials"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update own project materials"
on storage.objects for update to authenticated
using (bucket_id = 'project-materials' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'project-materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete own project materials"
on storage.objects for delete to authenticated
using (bucket_id = 'project-materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
