create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role := 'student';
begin
  if new.raw_user_meta_data ? 'role' then
    begin
      requested_role := (new.raw_user_meta_data ->> 'role')::public.app_role;
    exception
      when invalid_text_representation then
        requested_role := 'student';
    end;
  end if;

  insert into public.profiles (
    id,
    full_name,
    emis_number,
    mobile_number,
    district,
    school_name,
    class,
    section,
    language_preference,
    email,
    location_label,
    location_latitude,
    location_longitude,
    location_place_id
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Student'),
    nullif(new.raw_user_meta_data ->> 'emis_number', ''),
    nullif(new.raw_user_meta_data ->> 'mobile_number', ''),
    nullif(new.raw_user_meta_data ->> 'district', ''),
    nullif(new.raw_user_meta_data ->> 'school_name', ''),
    nullif(new.raw_user_meta_data ->> 'class', ''),
    nullif(new.raw_user_meta_data ->> 'section', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language_preference', ''), 'ta'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'location_label', ''),
    nullif(new.raw_user_meta_data ->> 'location_latitude', '')::double precision,
    nullif(new.raw_user_meta_data ->> 'location_longitude', '')::double precision,
    nullif(new.raw_user_meta_data ->> 'location_place_id', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    emis_number = excluded.emis_number,
    mobile_number = excluded.mobile_number,
    district = excluded.district,
    school_name = excluded.school_name,
    class = excluded.class,
    section = excluded.section,
    language_preference = excluded.language_preference,
    email = excluded.email,
    location_label = excluded.location_label,
    location_latitude = excluded.location_latitude,
    location_longitude = excluded.location_longitude,
    location_place_id = excluded.location_place_id,
    updated_at = now();

  insert into public.user_roles (user_id, role, district)
  values (
    new.id,
    requested_role,
    nullif(new.raw_user_meta_data ->> 'district', '')
  )
  on conflict (user_id, role) do update set
    district = excluded.district;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
