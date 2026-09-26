alter table public.google_connections add column auto_business text[] not null default '{}',
  add column auto_reminder_minutes integer check(auto_reminder_minutes between 0 and 40320);
create table public.google_outbox (
  owner_id uuid not null references public.google_connections(owner_id) on delete cascade,
  kind text not null check(kind in ('task','event','project','budget','payment','obligation')),
  local_id uuid not null,
  version uuid not null default gen_random_uuid(),
  queued_at timestamptz not null default now(),
  retry_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  primary key(owner_id,kind,local_id)
);
alter table public.google_outbox enable row level security;
revoke all on public.google_outbox from anon,authenticated;
grant all on public.google_outbox to service_role;
create index google_outbox_due on public.google_outbox(owner_id,retry_at);
create function public.enqueue_google_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare item jsonb; old_item jsonb; k text; o uuid;
begin
  item := case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if TG_OP='UPDATE' then
    old_item := to_jsonb(old);
    -- Notification reads do not change the task and must not consume Google quota.
    if item - array['updated_at','notification_read_at','notification_dismissed_at'] = old_item - array['updated_at','notification_read_at','notification_dismissed_at'] then return new; end if;
  end if;
  o := (item->>'owner_id')::uuid;
  k := TG_ARGV[0];
  if exists(select 1 from public.google_connections c where c.owner_id=o and c.status='connected'
    and (k in ('task','event') or k=any(c.auto_business))) then
    insert into public.google_outbox(owner_id,kind,local_id) values(o,k,(item->>'id')::uuid)
    on conflict(owner_id,kind,local_id) do update set version=gen_random_uuid(),queued_at=now(),retry_at=now(),attempts=0,last_error=null;
  end if;
  return case when TG_OP='DELETE' then old else new end;
end $$;
revoke all on function public.enqueue_google_change() from public,anon,authenticated;
create trigger google_queue_task after insert or update or delete on public.reminders for each row execute function public.enqueue_google_change('task');
create trigger google_queue_event after insert or update or delete on public.calendar_events for each row execute function public.enqueue_google_change('event');
create trigger google_queue_project after insert or update or delete on public.projects for each row execute function public.enqueue_google_change('project');
create trigger google_queue_budget after insert or update or delete on public.budgets for each row execute function public.enqueue_google_change('budget');
create trigger google_queue_payment after insert or update or delete on public.payments for each row execute function public.enqueue_google_change('payment');
create trigger google_queue_obligation after insert or update or delete on public.obligations for each row execute function public.enqueue_google_change('obligation');
