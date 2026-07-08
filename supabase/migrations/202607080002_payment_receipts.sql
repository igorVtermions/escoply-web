-- Optional receipt/proof attachment for project payments.

alter table public.payments
add column if not exists receipt_path text,
add column if not exists receipt_file_name text,
add column if not exists receipt_mime_type text,
add column if not exists receipt_file_size bigint;

alter table public.payments
drop constraint if exists payments_receipt_file_size_check;

alter table public.payments
add constraint payments_receipt_file_size_check
check (receipt_file_size is null or receipt_file_size > 0);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own payment receipts"
on storage.objects for select to authenticated
using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload own payment receipts"
on storage.objects for insert to authenticated
with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update own payment receipts"
on storage.objects for update to authenticated
using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete own payment receipts"
on storage.objects for delete to authenticated
using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
