create table if not exists public.student_signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  district text not null,
  school_name text not null,
  class text not null,
  section text,
  location_label text,
  location_latitude double precision,
  location_longitude double precision,
  location_place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_student_signups_district
  on public.student_signups(district, created_at desc);

alter table public.student_signups enable row level security;

drop policy if exists "Users can insert their own signup" on public.student_signups;
drop policy if exists "Users can view their own signup" on public.student_signups;
drop policy if exists "Users can update their own signup" on public.student_signups;
drop policy if exists "Admins can view signups in their district" on public.student_signups;

create policy "Users can insert their own signup" on public.student_signups
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can view their own signup" on public.student_signups
  for select to authenticated using (auth.uid() = user_id);

create policy "Users can update their own signup" on public.student_signups
  for update to authenticated using (auth.uid() = user_id);

create policy "Admins can view signups in their district" on public.student_signups
  for select to authenticated using (
    (public.has_role(auth.uid(), 'district_admin') and district = public.get_user_district(auth.uid()))
    or public.has_role(auth.uid(), 'super_admin')
  );
