-- Expand obligations so the web app can manage recurring costs, administrative routines,
-- agenda entries and notification read/dismissal state.

alter table public.obligations
add column if not exists description text,
add column if not exists recurrence text not null default 'monthly',
add column if not exists amount numeric(12, 2) check (amount is null or amount >= 0),
add column if not exists client_id uuid,
add column if not exists project_id uuid,
add column if not exists is_active boolean not null default true,
add column if not exists notification_read_at timestamptz,
add column if not exists notification_dismissed_at timestamptz;

alter table public.obligations
drop constraint if exists obligations_type_check;

alter table public.obligations
add constraint obligations_type_check
check (type in ('tax', 'subscription', 'client', 'administrative', 'financial', 'other', 'contribution'));

alter table public.obligations
drop constraint if exists obligations_status_check;

alter table public.obligations
add constraint obligations_status_check
check (status in ('pending', 'paid', 'overdue', 'upcoming', 'inactive', 'not_started', 'in_progress', 'completed'));

alter table public.obligations
drop constraint if exists obligations_recurrence_check;

alter table public.obligations
add constraint obligations_recurrence_check
check (recurrence in ('weekly', 'monthly', 'quarterly', 'yearly', 'custom'));

alter table public.obligations
drop constraint if exists obligations_client_owner_fkey;

alter table public.obligations
add constraint obligations_client_owner_fkey
foreign key (client_id, owner_id)
references public.clients (id, owner_id)
on delete set null (client_id);

alter table public.obligations
drop constraint if exists obligations_project_owner_fkey;

alter table public.obligations
add constraint obligations_project_owner_fkey
foreign key (project_id, owner_id)
references public.projects (id, owner_id)
on delete set null (project_id);

create index if not exists obligations_owner_status_idx
on public.obligations (owner_id, status);

create index if not exists obligations_owner_notification_idx
on public.obligations (owner_id, notification_read_at, due_date);

create index if not exists obligations_owner_notification_dismissed_idx
on public.obligations (owner_id, notification_dismissed_at, due_date);
