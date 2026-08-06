-- Admin-managed commercial plan settings.
-- Prices and promotions are editable from /admin/plans by trusted admin actions.

create table if not exists public.plans (
  plan text primary key,
  name text not null,
  description text not null,
  monthly_price numeric(10, 2) not null default 0 check (monthly_price >= 0),
  promotional_price numeric(10, 2) check (promotional_price is null or promotional_price >= 0),
  promotion_label text,
  promotion_ends_at date,
  is_promotion_active boolean not null default false,
  clients_limit integer check (clients_limit is null or clients_limit >= 0),
  projects_limit integer check (projects_limit is null or projects_limit >= 0),
  storage_limit text not null,
  has_pdf boolean not null default false,
  has_ai boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_plan_check check (plan in ('free', 'starter', 'pro', 'ai')),
  constraint plans_promotion_price_check check (
    is_promotion_active = false
    or promotional_price is not null
  )
);

insert into public.plans (
  plan,
  name,
  description,
  monthly_price,
  promotional_price,
  promotion_label,
  promotion_ends_at,
  is_promotion_active,
  clients_limit,
  projects_limit,
  storage_limit,
  has_pdf,
  has_ai,
  is_active
)
values
  ('free', 'Free', 'Para freelancers validarem a rotina inicial no Escoply.', 0, null, null, null, false, 3, 3, '100MB', false, false, true),
  ('starter', 'Starter', 'Para freelancers com primeiros clientes recorrentes.', 19.90, null, null, null, false, 15, 15, '1GB', true, false, true),
  ('pro', 'Pro', 'Para freelancers com volume maior e operação mais completa.', 39.90, null, null, null, false, null, null, '5GB', true, false, true),
  ('ai', 'AI', 'Tudo do Pro com camada inteligente planejada para o produto.', 69.90, null, null, null, false, null, null, '10GB', true, true, true)
on conflict (plan) do update set
  name = excluded.name,
  description = excluded.description,
  clients_limit = excluded.clients_limit,
  projects_limit = excluded.projects_limit,
  storage_limit = excluded.storage_limit,
  has_pdf = excluded.has_pdf,
  has_ai = excluded.has_ai,
  is_active = excluded.is_active;

drop trigger if exists plans_set_updated_at on public.plans;

create trigger plans_set_updated_at
before update on public.plans
for each row
execute function public.set_updated_at();

alter table public.plans enable row level security;

drop policy if exists "plans are readable by authenticated users" on public.plans;
create policy "plans are readable by authenticated users"
on public.plans
for select
to authenticated
using (true);

comment on table public.plans is 'Commercial plan settings managed by admin.';
comment on column public.plans.promotional_price is 'Optional promotional monthly price.';
comment on column public.plans.is_promotion_active is 'Controls whether promotional_price is shown and used in admin estimates.';
