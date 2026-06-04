create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique not null,
  password_hash text not null,
  role text default 'admin',
  created_at timestamptz default now()
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'student')),
  created_at timestamptz default now(),
  unique(user_id, role)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  gender text check (gender in ('male', 'female', 'other')),
  mobile_number text unique not null,
  password_hash text not null,
  school_name text,
  class text not null,
  district text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.students alter column gender set not null;
alter table public.students add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.students add column if not exists language_preference text not null default 'ta';

create table if not exists public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  login_time timestamptz default now(),
  logout_time timestamptz,
  device_info text,
  created_at timestamptz default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  class text,
  subject text,
  file_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.materials add column if not exists description text;
alter table public.materials add column if not exists file_url text;
alter table public.materials add column if not exists url text;
alter table public.materials add column if not exists type text default 'material';
alter table public.materials add column if not exists term text;
alter table public.materials add column if not exists material_type text;
alter table public.materials add column if not exists drive_file_id text;
alter table public.materials add column if not exists storage_path text;
alter table public.materials add column if not exists display_order integer default 0;
alter table public.materials add column if not exists source text;
alter table public.materials add column if not exists is_active boolean default true;
alter table public.materials add column if not exists updated_at timestamptz default now();
update public.materials set file_url = coalesce(file_url, url) where file_url is null and to_regclass('public.materials') is not null;
update public.materials set material_type = coalesce(material_type, type) where material_type is null and to_regclass('public.materials') is not null;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  class text,
  subject text,
  video_url text not null,
  thumbnail_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.videos add column if not exists description text;
alter table public.videos add column if not exists video_url text;
alter table public.videos add column if not exists url text;
alter table public.videos add column if not exists source text;
alter table public.videos add column if not exists term text;
alter table public.videos add column if not exists youtube_video_id text;
alter table public.videos add column if not exists thumbnail_url text;
alter table public.videos add column if not exists display_order integer default 0;
alter table public.videos add column if not exists is_active boolean default true;
alter table public.videos add column if not exists updated_at timestamptz default now();
update public.videos set video_url = coalesce(video_url, url) where video_url is null and to_regclass('public.videos') is not null;
update public.videos set video_url = '' where video_url is null;
alter table public.videos alter column video_url set not null;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  event_time time,
  location text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events add column if not exists location text;
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists district text;
alter table public.events add column if not exists school_name text;
alter table public.events add column if not exists target_class text;
alter table public.events add column if not exists audience text default 'all';
alter table public.events add column if not exists category text default 'General';
alter table public.events add column if not exists is_active boolean default true;
alter table public.events add column if not exists updated_at timestamptz default now();
update public.events set location = coalesce(location, venue) where location is null and to_regclass('public.events') is not null;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  student_name text,
  mobile_number text,
  message text not null,
  status text default 'new' check (status in ('new', 'reviewed', 'resolved')),
  admin_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.feedback add column if not exists student_name text;
alter table public.feedback add column if not exists mobile_number text;
alter table public.feedback add column if not exists admin_response text;
alter table public.feedback add column if not exists category text default 'general';
alter table public.feedback add column if not exists district text;
alter table public.feedback add column if not exists updated_at timestamptz default now();
update public.feedback set status = 'new' where status is null or status not in ('new', 'reviewed', 'resolved');

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.feedback'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.feedback drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.feedback'::regclass
    and contype = 'f'
    and exists (
      select 1
      from pg_attribute
      where attrelid = conrelid
        and attnum = any(conkey)
        and attname = 'student_id'::name
    );
  if constraint_name is not null then
    execute format('alter table public.feedback drop constraint %I', constraint_name);
  end if;
end $$;

update public.feedback
set student_id = null
where student_id is not null
  and not exists (select 1 from public.students where students.id = feedback.student_id);

alter table public.feedback
  add constraint feedback_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null;

alter table public.feedback
  add constraint feedback_status_check
  check (status in ('new', 'reviewed', 'resolved'));

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'feedback' and column_name = 'status'
  ) then
    alter table public.feedback alter column status set default 'new';
  end if;
end $$;

create table if not exists public.student_problems (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  title text not null,
  description text not null,
  category text,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_response text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.student_problems add column if not exists student_id uuid references public.students(id) on delete cascade;
alter table public.student_problems add column if not exists title text;
alter table public.student_problems add column if not exists description text;
alter table public.student_problems add column if not exists category text;
alter table public.student_problems add column if not exists admin_response text;
alter table public.student_problems add column if not exists updated_at timestamptz default now();
alter table public.student_problems add column if not exists name text;
alter table public.student_problems add column if not exists class text;
alter table public.student_problems add column if not exists district text;
alter table public.student_problems add column if not exists problem_description text;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'student_problems' and column_name = 'name') then
    alter table public.student_problems alter column name drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'student_problems' and column_name = 'class') then
    alter table public.student_problems alter column class drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'student_problems' and column_name = 'district') then
    alter table public.student_problems alter column district drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'student_problems' and column_name = 'problem_description') then
    alter table public.student_problems alter column problem_description drop not null;
  end if;
end $$;
update public.student_problems
set title = coalesce(title, name, 'Student problem'),
    description = coalesce(description, problem_description, 'No description provided'),
    status = case when status = 'pending' then 'open' else coalesce(status, 'open') end
where title is null or description is null or status is null or status = 'pending';
alter table public.student_problems alter column title set not null;
alter table public.student_problems alter column description set not null;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.student_problems'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.student_problems drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.student_problems
  add constraint student_problems_status_check
  check (status in ('open', 'in_progress', 'resolved', 'closed'));

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_type text not null,
  subject text not null,
  description text not null,
  district text not null,
  school_name text not null,
  class text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.complaints add column if not exists complaint_type text;
alter table public.complaints add column if not exists subject text;
alter table public.complaints add column if not exists description text;
alter table public.complaints add column if not exists district text;
alter table public.complaints add column if not exists school_name text;
alter table public.complaints add column if not exists class text;
alter table public.complaints add column if not exists student_id uuid references public.students(id) on delete set null;
alter table public.complaints add column if not exists status text default 'pending';
alter table public.complaints add column if not exists admin_response text;
alter table public.complaints add column if not exists updated_at timestamptz default now();

grant select, insert, update on table public.complaints to authenticated;
grant all on table public.complaints to service_role;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target_class text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists target_class text;
alter table public.notifications add column if not exists district text;
alter table public.notifications add column if not exists target_type text default 'all';
alter table public.notifications add column if not exists target_value text;
alter table public.notifications add column if not exists is_active boolean default true;
alter table public.notifications add column if not exists updated_at timestamptz default now();
update public.notifications set target_class = coalesce(target_class, target_value) where target_class is null and target_type = 'class';

alter table public.students enable row level security;
alter table public.student_sessions enable row level security;
alter table public.materials enable row level security;
alter table public.videos enable row level security;
alter table public.events enable row level security;
alter table public.feedback enable row level security;
alter table public.student_problems enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'student'
  );
$$;

drop policy if exists "Service role manages admin users" on public.admin_users;
create policy "Service role manages admin users" on public.admin_users for all to service_role using (true) with check (true);

drop policy if exists "Service role manages admin sessions" on public.admin_sessions;
create policy "Service role manages admin sessions" on public.admin_sessions for all to service_role using (true) with check (true);

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users create own student role" on public.user_roles;
create policy "Users create own student role" on public.user_roles for insert to authenticated with check (user_id = auth.uid() and role = 'student');

drop policy if exists "Service role manages user roles" on public.user_roles;
create policy "Service role manages user roles" on public.user_roles for all to service_role using (true) with check (true);

drop policy if exists "Service role manages students" on public.students;
create policy "Service role manages students" on public.students for all to service_role using (true) with check (true);

drop policy if exists "Students read own profile" on public.students;
create policy "Students read own profile" on public.students for select to authenticated using (auth_user_id = auth.uid() or public.is_admin());

drop policy if exists "Students create own profile" on public.students;
create policy "Students create own profile" on public.students for insert to authenticated with check (auth_user_id = auth.uid());

drop policy if exists "Students update own profile" on public.students;
create policy "Students update own profile" on public.students for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists "Service role manages student sessions" on public.student_sessions;
create policy "Service role manages student sessions" on public.student_sessions for all to service_role using (true) with check (true);

drop policy if exists "Students can read active materials" on public.materials;
create policy "Students can read active materials" on public.materials for select to anon, authenticated using (coalesce(is_active, true) or public.is_admin());

drop policy if exists "Admins manage materials" on public.materials;
create policy "Admins manage materials" on public.materials for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students can read active videos" on public.videos;
create policy "Students can read active videos" on public.videos for select to anon, authenticated using (coalesce(is_active, true) or public.is_admin());

drop policy if exists "Admins manage videos" on public.videos;
create policy "Admins manage videos" on public.videos for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students can read active events" on public.events;
create policy "Students can read active events" on public.events for select to anon, authenticated using (coalesce(is_active, true) or public.is_admin());

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students can read active notifications" on public.notifications;
create policy "Students can read active notifications" on public.notifications for select to anon, authenticated using (coalesce(is_active, true) or public.is_admin());

drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Admins manage notifications" on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Service role manages feedback" on public.feedback;
create policy "Service role manages feedback" on public.feedback for all to service_role using (true) with check (true);

drop policy if exists "Students create feedback" on public.feedback;
create policy "Students create feedback" on public.feedback for insert to authenticated with check (
  public.is_student() and exists (select 1 from public.students where id = student_id and auth_user_id = auth.uid())
);

drop policy if exists "Students read own feedback" on public.feedback;
create policy "Students read own feedback" on public.feedback for select to authenticated using (
  public.is_admin() or exists (select 1 from public.students where id = student_id and auth_user_id = auth.uid())
);

drop policy if exists "Admins update feedback" on public.feedback;
create policy "Admins update feedback" on public.feedback for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Service role manages student problems" on public.student_problems;
create policy "Service role manages student problems" on public.student_problems for all to service_role using (true) with check (true);

drop policy if exists "Students create student problems" on public.student_problems;
create policy "Students create student problems" on public.student_problems for insert to authenticated with check (
  public.is_student() and exists (select 1 from public.students where id = student_id and auth_user_id = auth.uid())
);

drop policy if exists "Students read own student problems" on public.student_problems;
create policy "Students read own student problems" on public.student_problems for select to authenticated using (
  public.is_admin() or exists (select 1 from public.students where id = student_id and auth_user_id = auth.uid())
);

drop policy if exists "Admins update student problems" on public.student_problems;
create policy "Admins update student problems" on public.student_problems for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Direct admins view complaints" on public.complaints;
create policy "Direct admins view complaints" on public.complaints for select to authenticated using (public.is_admin());

drop policy if exists "Direct admins update complaints" on public.complaints;
create policy "Direct admins update complaints" on public.complaints for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Direct students create complaints" on public.complaints;
create policy "Direct students create complaints" on public.complaints for insert to authenticated with check (public.is_student());

create index if not exists idx_students_mobile_number on public.students(mobile_number);
create index if not exists idx_students_auth_user_id on public.students(auth_user_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id, role);
create index if not exists idx_admin_users_email on public.admin_users(email);
create index if not exists idx_admin_sessions_token on public.admin_sessions(token);
create index if not exists idx_student_sessions_student_id on public.student_sessions(student_id, login_time desc);
create index if not exists idx_materials_class on public.materials(class);
create index if not exists idx_materials_class_subject_term on public.materials(class, subject, term);
create index if not exists idx_materials_drive_file_id on public.materials(drive_file_id);
create index if not exists idx_videos_class on public.videos(class);
create index if not exists idx_videos_class_subject_term on public.videos(class, subject, term);
create index if not exists idx_videos_youtube_video_id on public.videos(youtube_video_id);
create index if not exists idx_events_event_date on public.events(event_date);
create index if not exists idx_feedback_student_id on public.feedback(student_id, created_at desc);
create index if not exists idx_student_problems_student_id on public.student_problems(student_id, created_at desc);

notify pgrst, 'reload schema';
