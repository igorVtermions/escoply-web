alter table public.reminders
add column if not exists notification_dismissed_at timestamptz;

create index if not exists reminders_owner_notification_dismissed_idx
on public.reminders (owner_id, notification_dismissed_at, scheduled_at);
