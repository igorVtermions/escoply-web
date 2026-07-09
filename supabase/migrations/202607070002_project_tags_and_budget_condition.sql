-- Project categorization and budget payment terms.

alter table public.projects
add column if not exists work_type text not null default 'design',
add column if not exists tags text[] not null default '{}';

alter table public.projects
drop constraint if exists projects_work_type_check;

alter table public.projects
add constraint projects_work_type_check
check (work_type in ('design', 'tech', 'marketing', 'content', 'consulting', 'branding', 'automation', 'other'));

alter table public.projects
drop constraint if exists projects_tags_length_check;

alter table public.projects
add constraint projects_tags_length_check
check (cardinality(tags) <= 12);

alter table public.budgets
add column if not exists payment_condition text;

alter table public.budgets
drop constraint if exists budgets_payment_condition_length_check;

alter table public.budgets
add constraint budgets_payment_condition_length_check
check (payment_condition is null or char_length(payment_condition) <= 180);
