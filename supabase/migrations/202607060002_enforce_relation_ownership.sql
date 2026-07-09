-- Prevent records from referencing resources owned by a different account.

alter table public.clients add constraint clients_id_owner_unique unique (id, owner_id);
alter table public.projects add constraint projects_id_owner_unique unique (id, owner_id);
alter table public.budgets add constraint budgets_id_owner_unique unique (id, owner_id);

alter table public.projects drop constraint projects_client_id_fkey;
alter table public.projects
  add constraint projects_client_owner_fkey
  foreign key (client_id, owner_id)
  references public.clients (id, owner_id)
  on delete cascade;

alter table public.reminders drop constraint reminders_project_id_fkey;
alter table public.reminders
  add constraint reminders_project_owner_fkey
  foreign key (project_id, owner_id)
  references public.projects (id, owner_id)
  on delete cascade;

alter table public.budgets drop constraint budgets_project_id_fkey;
alter table public.budgets
  add constraint budgets_project_owner_fkey
  foreign key (project_id, owner_id)
  references public.projects (id, owner_id)
  on delete cascade;

alter table public.payments drop constraint payments_project_id_fkey;
alter table public.payments drop constraint payments_budget_id_fkey;
alter table public.payments
  add constraint payments_project_owner_fkey
  foreign key (project_id, owner_id)
  references public.projects (id, owner_id)
  on delete cascade;
alter table public.payments
  add constraint payments_budget_owner_fkey
  foreign key (budget_id, owner_id)
  references public.budgets (id, owner_id)
  on delete set null (budget_id);
