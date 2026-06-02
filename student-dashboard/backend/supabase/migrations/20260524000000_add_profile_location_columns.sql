alter table public.profiles
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision,
  add column if not exists location_place_id text;