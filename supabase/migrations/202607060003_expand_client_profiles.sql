alter table public.clients
  add column website text,
  add column whatsapp text,
  add column notes text;

alter table public.clients
  add constraint clients_website_length check (website is null or char_length(website) <= 300),
  add constraint clients_whatsapp_length check (whatsapp is null or char_length(whatsapp) <= 40),
  add constraint clients_notes_length check (notes is null or char_length(notes) <= 3000);

create index clients_owner_name_idx on public.clients (owner_id, name);
