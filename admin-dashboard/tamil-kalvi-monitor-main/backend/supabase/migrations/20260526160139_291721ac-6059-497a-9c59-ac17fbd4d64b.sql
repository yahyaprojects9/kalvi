
-- Admins table (any signed-in user is treated as admin in this lightweight portal)
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read all" ON public.admins FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert self" ON public.admins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT,
  school TEXT NOT NULL,
  district TEXT NOT NULL,
  class TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Activity logs (login events)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  student_name TEXT NOT NULL,
  school TEXT NOT NULL,
  district TEXT NOT NULL,
  class TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'login',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read activity" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write activity" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs (created_at DESC);

-- Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  student_name TEXT NOT NULL,
  school TEXT,
  class TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read feedback" ON public.feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write feedback" ON public.feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_value TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write announcements" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  venue TEXT,
  class TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
