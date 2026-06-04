create sequence if not exists public.feedback_reference_seq;

alter table public.feedback add column if not exists feedback_ref text;
alter table public.feedback add column if not exists subject text;
alter table public.feedback add column if not exists updated_at timestamptz default now();

with numbered as (
  select
    id,
    coalesce(created_at, now()) as created_at,
    row_number() over (order by created_at, id) as rn
  from public.feedback
  where feedback_ref is null or trim(feedback_ref) = ''
)
update public.feedback f
set feedback_ref = 'FB-' || to_char(n.created_at, 'YYYY') || '-' || lpad(n.rn::text, 6, '0')
from numbered n
where f.id = n.id;

update public.feedback
set subject = coalesce(nullif(trim(subject), ''), nullif(trim(category), ''), 'General')
where subject is null or trim(subject) = '';

create unique index if not exists idx_feedback_feedback_ref on public.feedback(feedback_ref);

select setval(
  'public.feedback_reference_seq',
  greatest(
    (select coalesce(max((substring(feedback_ref from '[0-9]+$'))::bigint), 0) from public.feedback),
    0
  ) + 1,
  false
);

create or replace function public.assign_feedback_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.feedback_ref is null or trim(new.feedback_ref) = '' then
    new.feedback_ref :=
      'FB-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') ||
      '-' ||
      lpad(nextval('public.feedback_reference_seq')::text, 6, '0');
  end if;

  if new.subject is null or trim(new.subject) = '' then
    new.subject := coalesce(nullif(trim(new.category), ''), 'General');
  end if;

  if new.updated_at is null then
    new.updated_at := coalesce(new.created_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_feedback_reference on public.feedback;
create trigger trg_assign_feedback_reference
before insert on public.feedback
for each row execute function public.assign_feedback_reference();

alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists feedback_id uuid;
alter table public.notifications add column if not exists feedback_ref text;
alter table public.notifications add column if not exists updated_at timestamptz default now();

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.notifications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, student_id)
);

grant select, insert, update on public.announcement_reads to authenticated;
grant all on public.announcement_reads to service_role;
alter table public.announcement_reads enable row level security;

drop policy if exists "Students manage own announcement reads" on public.announcement_reads;
create policy "Students manage own announcement reads"
on public.announcement_reads
for all
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.auth_user_id = auth.uid()
  )
  or public.is_admin()
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.auth_user_id = auth.uid()
  )
  or public.is_admin()
);

create or replace function public.notify_feedback_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row record;
  reply_text text;
  tracking_id text;
begin
  reply_text := nullif(trim(coalesce(new.admin_response, '')), '');
  if new.student_id is null or reply_text is null then
    return new;
  end if;

  if coalesce(old.admin_response, '') is not distinct from coalesce(new.admin_response, '')
     and coalesce(old.status, '') is not distinct from coalesce(new.status, '') then
    return new;
  end if;

  tracking_id := coalesce(nullif(trim(new.feedback_ref), ''), new.id::text);
  select class, district into student_row from public.students where id = new.student_id;

  insert into public.notifications (
    title,
    message,
    target_type,
    target_value,
    target_class,
    district,
    is_active,
    is_read,
    feedback_id,
    feedback_ref
  )
  values (
    'Feedback Reply Received',
    'Admin replied to Feedback ' || tracking_id ||
      E'\n\nReply: ' || reply_text ||
      E'\n\nTime: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    'student',
    new.student_id::text,
    student_row.class,
    coalesce(new.district, student_row.district),
    true,
    false,
    new.id,
    tracking_id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_feedback_reply on public.feedback;
create trigger trg_notify_feedback_reply
after update of status, admin_response on public.feedback
for each row execute function public.notify_feedback_reply();
