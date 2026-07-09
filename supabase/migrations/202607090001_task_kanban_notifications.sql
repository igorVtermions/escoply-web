-- Separate task workflow status from notification read state.

alter table public.reminders
add column if not exists task_status text not null default 'todo',
add column if not exists notification_read_at timestamptz;

alter table public.reminders
drop constraint if exists reminders_task_status_check;

alter table public.reminders
add constraint reminders_task_status_check
check (task_status in ('todo', 'in_progress', 'paused', 'completed'));

update public.reminders
set task_status = 'completed'
where completed_at is not null
  and task_status <> 'completed';

create index if not exists reminders_owner_task_status_idx
on public.reminders (owner_id, task_status);

create index if not exists reminders_owner_notification_idx
on public.reminders (owner_id, notification_read_at, scheduled_at);
