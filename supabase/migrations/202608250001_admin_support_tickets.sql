-- Real support center tables for the Escoply admin panel.
-- Tickets can be created by authenticated users in future product flows and
-- managed by trusted admin server actions with the service role.

create sequence if not exists public.support_ticket_code_seq;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  user_id uuid references auth.users (id) on delete set null,
  user_name text not null,
  user_email text not null,
  user_plan text not null default 'free',
  type text not null default 'support',
  subject text not null,
  message text not null,
  priority text not null default 'medium',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reply_at timestamptz,
  constraint support_tickets_user_name_length check (char_length(user_name) between 2 and 160),
  constraint support_tickets_user_email_length check (char_length(user_email) between 5 and 254),
  constraint support_tickets_subject_length check (char_length(subject) between 3 and 180),
  constraint support_tickets_message_length check (char_length(message) between 3 and 5000),
  constraint support_tickets_user_plan_check check (user_plan in ('free', 'starter', 'pro', 'ai')),
  constraint support_tickets_type_check check (type in ('support', 'bug', 'question', 'billing', 'access', 'suggestion', 'feature_request', 'criticism')),
  constraint support_tickets_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint support_tickets_status_check check (status in ('new', 'open', 'in_progress', 'waiting_user', 'planned', 'resolved', 'closed', 'rejected'))
);

create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_role text not null default 'admin',
  message text not null,
  created_at timestamptz not null default now(),
  constraint support_ticket_replies_author_role_check check (author_role in ('user', 'admin')),
  constraint support_ticket_replies_message_length check (char_length(message) between 2 and 5000)
);

create or replace function public.set_support_ticket_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.code is null or trim(new.code) = '' then
    new.code := 'SUP-' || lpad(nextval('public.support_ticket_code_seq')::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_set_code on public.support_tickets;

create trigger support_tickets_set_code
before insert on public.support_tickets
for each row
execute function public.set_support_ticket_code();

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;

create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row
execute function public.set_updated_at();

alter table public.support_tickets enable row level security;
alter table public.support_ticket_replies enable row level security;

drop policy if exists "Users can create their own support tickets" on public.support_tickets;
create policy "Users can create their own support tickets"
on public.support_tickets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own support tickets" on public.support_tickets;
create policy "Users can read their own support tickets"
on public.support_tickets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read replies from their own tickets" on public.support_ticket_replies;
create policy "Users can read replies from their own tickets"
on public.support_ticket_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.support_tickets
    where support_tickets.id = support_ticket_replies.ticket_id
      and support_tickets.user_id = (select auth.uid())
  )
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_priority_idx on public.support_tickets (priority);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);
create index if not exists support_ticket_replies_ticket_id_idx on public.support_ticket_replies (ticket_id);

grant select, insert on table public.support_tickets to authenticated;
grant select on table public.support_ticket_replies to authenticated;

comment on table public.support_tickets is 'Support tickets, feedback, bugs, access and billing requests from Escoply users.';
comment on table public.support_ticket_replies is 'Conversation history for support tickets.';
