create table if not exists public.complaints (
  id uuid default gen_random_uuid() primary key,
  complaint_type varchar(100) not null,
  subject varchar(255) not null,
  description text not null,
  district varchar(255) not null,
  school_name varchar(255) not null,
  class varchar(100) not null,
  status varchar(50) default 'pending',
  created_at timestamp with time zone default now()
);

alter table public.complaints enable row level security;

grant select, insert, update on table public.complaints to authenticated;
grant all on table public.complaints to service_role;

drop policy if exists "Students can submit anonymous complaints" on public.complaints;
create policy "Students can submit anonymous complaints" on public.complaints
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Admins can view complaints" on public.complaints;
create policy "Admins can view complaints" on public.complaints
for select
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or public.has_role(auth.uid(), 'district_admin')
);

drop policy if exists "Admins can update complaint status" on public.complaints;
create policy "Admins can update complaint status" on public.complaints
for update
to authenticated
using (
  public.has_role(auth.uid(), 'super_admin')
  or public.has_role(auth.uid(), 'district_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin')
  or public.has_role(auth.uid(), 'district_admin')
);

drop policy if exists "Service role can manage complaints" on public.complaints;
create policy "Service role can manage complaints" on public.complaints
for all
to service_role
using (true)
with check (true);

create index if not exists idx_complaints_district on public.complaints(district);
create index if not exists idx_complaints_school_name on public.complaints(school_name);
create index if not exists idx_complaints_class on public.complaints(class);
create index if not exists idx_complaints_type on public.complaints(complaint_type);
create index if not exists idx_complaints_status on public.complaints(status);
