create table if not exists public.student_problems (
  id uuid default gen_random_uuid() primary key,
  name varchar(255) not null,
  class varchar(100) not null,
  district varchar(255) not null,
  problem_description text not null,
  status varchar(50) default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.student_problems enable row level security;

grant all on table public.student_problems to service_role;

drop policy if exists "Service role can manage student problems" on public.student_problems;
create policy "Service role can manage student problems" on public.student_problems
for all
to service_role
using (true)
with check (true);

create index if not exists idx_student_problems_district on public.student_problems(district);
create index if not exists idx_student_problems_class on public.student_problems(class);
