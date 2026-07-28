-- Adds an explicit semantic type to project payments/receivables.
-- This avoids relying on free-text descriptions to understand whether a
-- receivable is an initial deposit, an installment, a final balance, or an
-- extra amount outside the original scope.

alter table public.payments
  add column if not exists payment_type text not null default 'installment';

alter table public.payments
  drop constraint if exists payments_payment_type_check;

alter table public.payments
  add constraint payments_payment_type_check
  check (payment_type in ('deposit', 'final_payment', 'installment', 'extra'));

update public.payments
set payment_type = case
  when lower(description) like '%sinal%' or lower(description) like '%entrada%' then 'deposit'
  when lower(description) like '%saldo%' or lower(description) like '%final%' then 'final_payment'
  when lower(description) like '%parcela%' then 'installment'
  else payment_type
end;
