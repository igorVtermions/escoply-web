-- Profile settings fields used by the Escoply settings page.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists profession text,
  add column if not exists bio text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_phone_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_phone_length check (phone is null or char_length(phone) <= 40) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profession_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_profession_length check (profession is null or char_length(profession) <= 120) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_bio_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280) not valid;
  end if;
end $$;

alter table public.profiles validate constraint profiles_phone_length;
alter table public.profiles validate constraint profiles_profession_length;
alter table public.profiles validate constraint profiles_bio_length;

comment on column public.profiles.phone is 'Optional contact phone for the logged user profile.';
comment on column public.profiles.profession is 'Professional role or occupation shown in account settings.';
comment on column public.profiles.bio is 'Short professional bio shown in account settings.';
