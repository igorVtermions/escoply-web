-- Core data used by the authenticated dashboard.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  company_name text,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'prospect', 'inactive')),
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_length check (char_length(name) between 2 and 120)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'in_progress' check (status in ('in_progress', 'review', 'completed', 'delayed', 'archived')),
  deadline date,
  estimated_value numeric(12, 2) not null default 0 check (estimated_value >= 0),
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_length check (char_length(name) between 2 and 160)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  title text not null,
  kind text not null default 'action' check (kind in ('meeting', 'action', 'review', 'delivery', 'follow_up', 'charge', 'other')),
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_title_length check (char_length(title) between 2 and 180)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected', 'expired')),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  budget_id uuid references public.budgets (id) on delete set null,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_description_length check (char_length(description) between 2 and 180)
);

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null default 'administrative' check (type in ('tax', 'contribution', 'administrative', 'financial', 'other')),
  due_date date not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'pending', 'paid', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obligations_title_length check (char_length(title) between 2 and 180)
);

create index clients_owner_status_idx on public.clients (owner_id, status);
create index projects_owner_status_idx on public.projects (owner_id, status);
create index projects_owner_deadline_idx on public.projects (owner_id, deadline);
create index reminders_owner_scheduled_idx on public.reminders (owner_id, scheduled_at);
create index budgets_owner_status_idx on public.budgets (owner_id, status);
create index payments_owner_status_due_idx on public.payments (owner_id, status, due_date);
create index obligations_owner_due_idx on public.obligations (owner_id, due_date);

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.reminders enable row level security;
alter table public.budgets enable row level security;
alter table public.payments enable row level security;
alter table public.obligations enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['clients', 'projects', 'reminders', 'budgets', 'payments', 'obligations']
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
