-- KalviThozhan starter records.
-- Run after schema.sql and policies.sql from the Supabase SQL editor.
-- This seed intentionally avoids auth.users-dependent tables.

insert into public.schools (id, name, district, type)
values
  ('11111111-1111-4111-8111-111111111111', 'Government Higher Secondary School, Madurai', 'Madurai', 'Government'),
  ('22222222-2222-4222-8222-222222222222', 'Chennai Primary School, Saidapet', 'Chennai', 'Government'),
  ('33333333-3333-4333-8333-333333333333', 'Government Girls HSS, Coimbatore', 'Coimbatore', 'Government')
on conflict (id) do update set
  name = excluded.name,
  district = excluded.district,
  type = excluded.type;

insert into public.materials (id, title, title_ta, class, subject, subject_ta, chapter, type, language, url, source)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Class 5 Tamil Textbook', 'Class 5 Tamil Textbook', '5', 'Tamil', 'Tamil', 'Term 1', 'textbook', 'ta', 'https://www.tntextbooks.in/p/school-books.html', 'TN Textbooks'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Class 10 Science Textbook', 'Class 10 Science Textbook', '10', 'Science', 'Science', 'Electricity', 'textbook', 'ta', 'https://www.tntextbooks.in/p/school-books.html', 'TN Textbooks'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Class 12 Physics Textbook', 'Class 12 Physics Textbook', '12', 'Physics', 'Physics', 'Electrostatics', 'textbook', 'en', 'https://www.tntextbooks.in/p/school-books.html', 'TN Textbooks')
on conflict (id) do update set
  title = excluded.title,
  title_ta = excluded.title_ta,
  class = excluded.class,
  subject = excluded.subject,
  subject_ta = excluded.subject_ta,
  chapter = excluded.chapter,
  type = excluded.type,
  language = excluded.language,
  url = excluded.url,
  source = excluded.source;

insert into public.videos (id, title, title_ta, class, subject, subject_ta, chapter, url, source, duration_minutes)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Class 5 Maths Lesson', 'Class 5 Maths Lesson', '5', 'Mathematics', 'Mathematics', 'Fractions', 'https://www.youtube.com/watch?v=2UrcUfBizyw', 'YouTube / Kalvi TV', 18),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Class 10 Science Electricity', 'Class 10 Science Electricity', '10', 'Science', 'Science', 'Electricity', 'https://www.youtube.com/watch?v=VMS1gNnp_zs', 'YouTube / Kalvi TV', 24),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'Class 12 Physics Electrostatics', 'Class 12 Physics Electrostatics', '12', 'Physics', 'Physics', 'Electrostatics', 'https://www.youtube.com/watch?v=H14bBuluwB8', 'YouTube', 32)
on conflict (id) do update set
  title = excluded.title,
  title_ta = excluded.title_ta,
  class = excluded.class,
  subject = excluded.subject,
  subject_ta = excluded.subject_ta,
  chapter = excluded.chapter,
  url = excluded.url,
  source = excluded.source,
  duration_minutes = excluded.duration_minutes;

insert into public.events (id, title, title_ta, description, event_date, event_time, venue, target_class, district, registration_url)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Zonal Athletics Meet', 'Zonal Athletics Meet', 'Track and field events for school teams.', '2026-07-12', '09:00', 'District Stadium, Madurai', '10,12', 'Madurai', 'https://tnschools.gov.in/'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Science Exhibition', 'Science Exhibition', 'Student science models and project display.', '2026-08-05', '10:30', 'Government HSS, Coimbatore', '5,10,12', 'Coimbatore', null)
on conflict (id) do update set
  title = excluded.title,
  title_ta = excluded.title_ta,
  description = excluded.description,
  event_date = excluded.event_date,
  event_time = excluded.event_time,
  venue = excluded.venue,
  target_class = excluded.target_class,
  district = excluded.district,
  registration_url = excluded.registration_url;

insert into public.notifications (id, title, message, target_type, target_value)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'Rain Leave Alert', 'Check district notices for rain leave updates before travelling to school.', 'district', 'Madurai'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'New Class 10 Materials', 'Science revision notes and model papers were added.', 'class', '10'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd3', 'Scholarship Notice', 'Scholarship application window is open for eligible students.', 'all', null)
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  target_type = excluded.target_type,
  target_value = excluded.target_value;
