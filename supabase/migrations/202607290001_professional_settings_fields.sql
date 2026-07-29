-- Professional account settings used in documents, reports and public-facing exports.

alter table public.profiles
  add column if not exists professional_type text,
  add column if not exists document text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists website text,
  add column if not exists instagram text,
  add column if not exists linkedin text,
  add column if not exists business_whatsapp text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_professional_type_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_professional_type_length check (professional_type is null or char_length(professional_type) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_document_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_document_length check (document is null or char_length(document) <= 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_city_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_city_length check (city is null or char_length(city) <= 120) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_state_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_state_length check (state is null or char_length(state) <= 60) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_website_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_website_length check (website is null or char_length(website) <= 240) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_instagram_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_instagram_length check (instagram is null or char_length(instagram) <= 120) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_linkedin_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_linkedin_length check (linkedin is null or char_length(linkedin) <= 240) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_business_whatsapp_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_business_whatsapp_length check (business_whatsapp is null or char_length(business_whatsapp) <= 40) not valid;
  end if;
end $$;

alter table public.profiles validate constraint profiles_professional_type_length;
alter table public.profiles validate constraint profiles_document_length;
alter table public.profiles validate constraint profiles_city_length;
alter table public.profiles validate constraint profiles_state_length;
alter table public.profiles validate constraint profiles_website_length;
alter table public.profiles validate constraint profiles_instagram_length;
alter table public.profiles validate constraint profiles_linkedin_length;
alter table public.profiles validate constraint profiles_business_whatsapp_length;

comment on column public.profiles.professional_type is 'Professional category used in settings and exported documents.';
comment on column public.profiles.document is 'Optional document/CNPJ for professional profile.';
comment on column public.profiles.city is 'Professional city.';
comment on column public.profiles.state is 'Professional state.';
comment on column public.profiles.website is 'Professional website.';
comment on column public.profiles.instagram is 'Professional Instagram profile.';
comment on column public.profiles.linkedin is 'Professional LinkedIn profile.';
comment on column public.profiles.business_whatsapp is 'Business WhatsApp number.';
