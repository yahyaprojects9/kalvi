
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'district_admin', 'super_admin');

-- user_roles table (separate to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  district text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_district(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT district FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  emis_number text UNIQUE,
  mobile_number text,
  district text,
  school_name text,
  class text,
  section text,
  subject text,
  language_preference text NOT NULL DEFAULT 'ta',
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- schools
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL,
  type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- materials
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ta text,
  class text NOT NULL,
  subject text NOT NULL,
  subject_ta text,
  chapter text,
  type text NOT NULL,
  language text NOT NULL DEFAULT 'ta',
  url text NOT NULL,
  source text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- videos
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ta text,
  class text NOT NULL,
  subject text NOT NULL,
  subject_ta text,
  chapter text,
  url text NOT NULL,
  source text,
  thumbnail_url text,
  duration_minutes integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ta text,
  description text,
  event_date date NOT NULL,
  event_time text,
  venue text,
  target_class text,
  district text,
  registration_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_type text NOT NULL DEFAULT 'all', -- all | district | class | school
  target_value text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- activity_logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  school_name text,
  district text,
  class text,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- feedback
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  response text,
  district text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view profiles in their district" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'district_admin') AND district = public.get_user_district(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- schools
CREATE POLICY "Anyone authenticated can read schools" ON public.schools
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert schools" ON public.schools
  FOR INSERT TO authenticated WITH CHECK (true);

-- materials
CREATE POLICY "Authenticated can read materials" ON public.materials
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers/admins can insert materials" ON public.materials
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'district_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Teachers/admins can update materials" ON public.materials
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'district_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- videos
CREATE POLICY "Authenticated can read videos" ON public.videos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers/admins can insert videos" ON public.videos
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'district_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- events
CREATE POLICY "Authenticated can read events" ON public.events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'district_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- notifications
CREATE POLICY "Authenticated can read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'district_admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

-- activity_logs
CREATE POLICY "Users can insert their own activity" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own activity" ON public.activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "District admins can view district activity" ON public.activity_logs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'district_admin') AND district = public.get_user_district(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- feedback
CREATE POLICY "Students submit feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students see own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins see district feedback" ON public.feedback
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'district_admin') AND district = public.get_user_district(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Admins update feedback" ON public.feedback
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'district_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Indexes
CREATE INDEX idx_materials_class ON public.materials(class);
CREATE INDEX idx_videos_class ON public.videos(class);
CREATE INDEX idx_activity_district ON public.activity_logs(district, created_at DESC);
CREATE INDEX idx_schools_district ON public.schools(district);
