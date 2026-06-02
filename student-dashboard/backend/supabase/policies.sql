-- KalviThozhan row-level security policies.
-- Safe to rerun after schema.sql because existing policies are dropped first.

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.student_signups enable row level security;
alter table public.schools enable row level security;
alter table public.materials enable row level security;
alter table public.videos enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "Users can view their own roles" on public.user_roles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Admins can view profiles in their district" on public.profiles;
drop policy if exists "Users can insert their own signup" on public.student_signups;
drop policy if exists "Users can view their own signup" on public.student_signups;
drop policy if exists "Users can update their own signup" on public.student_signups;
drop policy if exists "Admins can view signups in their district" on public.student_signups;
drop policy if exists "Anyone authenticated can read schools" on public.schools;
drop policy if exists "Anyone can insert schools" on public.schools;
drop policy if exists "Admins can insert schools" on public.schools;
drop policy if exists "Authenticated can read materials" on public.materials;
drop policy if exists "Teachers/admins can insert materials" on public.materials;
drop policy if exists "Teachers/admins can update materials" on public.materials;
drop policy if exists "Authenticated can read videos" on public.videos;
drop policy if exists "Teachers/admins can insert videos" on public.videos;
drop policy if exists "Authenticated can read events" on public.events;
drop policy if exists "Admins can manage events" on public.events;
drop policy if exists "Authenticated can read notifications" on public.notifications;
drop policy if exists "Admins can create notifications" on public.notifications;
drop policy if exists "Users can insert their own activity" on public.activity_logs;
drop policy if exists "Users can view their own activity" on public.activity_logs;
drop policy if exists "District admins can view district activity" on public.activity_logs;
drop policy if exists "Students submit feedback" on public.feedback;
drop policy if exists "Students see own feedback" on public.feedback;
drop policy if exists "Admins see district feedback" on public.feedback;
drop policy if exists "Admins update feedback" on public.feedback;

create policy "Users can view their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create policy "Users can view their own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "Admins can view profiles in their district" on public.profiles
  for select to authenticated using (
    (public.has_role(auth.uid(), 'district_admin') and district = public.get_user_district(auth.uid()))
    or public.has_role(auth.uid(), 'super_admin')
  );

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

create policy "Anyone authenticated can read schools" on public.schools
  for select to authenticated using (true);

create policy "Admins can insert schools" on public.schools
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Authenticated can read materials" on public.materials
  for select to authenticated using (true);

create policy "Teachers/admins can insert materials" on public.materials
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Teachers/admins can update materials" on public.materials
  for update to authenticated using (
    public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Authenticated can read videos" on public.videos
  for select to authenticated using (true);

create policy "Teachers/admins can insert videos" on public.videos
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'teacher')
    or public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Authenticated can read events" on public.events
  for select to authenticated using (true);

create policy "Admins can manage events" on public.events
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Authenticated can read notifications" on public.notifications
  for select to authenticated using (true);

create policy "Admins can create notifications" on public.notifications
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
    or public.has_role(auth.uid(), 'teacher')
  );

create policy "Users can insert their own activity" on public.activity_logs
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can view their own activity" on public.activity_logs
  for select to authenticated using (auth.uid() = user_id);

create policy "District admins can view district activity" on public.activity_logs
  for select to authenticated using (
    (public.has_role(auth.uid(), 'district_admin') and district = public.get_user_district(auth.uid()))
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Students submit feedback" on public.feedback
  for insert to authenticated with check (auth.uid() = student_id);

create policy "Students see own feedback" on public.feedback
  for select to authenticated using (auth.uid() = student_id);

create policy "Admins see district feedback" on public.feedback
  for select to authenticated using (
    (public.has_role(auth.uid(), 'district_admin') and district = public.get_user_district(auth.uid()))
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Admins update feedback" on public.feedback
  for update to authenticated using (
    public.has_role(auth.uid(), 'district_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.get_user_district(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.get_user_district(uuid) to authenticated;
