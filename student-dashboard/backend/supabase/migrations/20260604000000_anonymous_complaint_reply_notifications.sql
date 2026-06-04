create or replace function public.notify_anonymous_complaint_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row record;
  base_message text;
begin
  if new.student_id is null then
    return new;
  end if;

  if coalesce(new.status, '') is not distinct from coalesce(old.status, '')
    and coalesce(new.admin_response, '') is not distinct from coalesce(old.admin_response, '') then
    return new;
  end if;

  select id, class, district, school_name
    into student_row
    from public.students
    where id = new.student_id
    limit 1;

  base_message := case lower(coalesce(new.status, ''))
    when 'resolved' then 'Your anonymous complaint issue has been resolved.'
    when 'closed' then 'Your anonymous complaint has been closed.'
    when 'in_progress' then 'Your anonymous complaint is being reviewed.'
    else 'Your anonymous complaint status has been updated.'
  end;

  if nullif(trim(coalesce(new.admin_response, '')), '') is not null then
    base_message := base_message || E'\n\nAdmin reply: ' || trim(new.admin_response);
  end if;

  insert into public.notifications (
    title,
    message,
    target_type,
    target_value,
    target_class,
    district,
    is_active
  )
  values (
    'Anonymous complaint status update',
    base_message,
    'student',
    new.student_id::text,
    coalesce(new.class, student_row.class),
    coalesce(new.district, student_row.district),
    true
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_anonymous_complaint_reply on public.complaints;

create trigger trg_notify_anonymous_complaint_reply
  after update of status, admin_response on public.complaints
  for each row
  execute function public.notify_anonymous_complaint_reply();

notify pgrst, 'reload schema';
