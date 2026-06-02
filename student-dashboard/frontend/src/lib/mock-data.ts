import type { Profile, Role } from "./auth-context";

export type Material = {
  id: string;
  title: string;
  title_ta?: string;
  class: string;
  subject: string;
  subject_ta?: string;
  chapter?: string;
  type: string;
  language: "ta" | "en";
  medium?: string;
  url: string;
  source: string;
  created_at: string;
};

export type Video = {
  id: string;
  title: string;
  title_ta?: string;
  class: string;
  subject: string;
  subject_ta?: string;
  chapter?: string;
  url: string;
  source: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  created_at: string;
};

export type EventItem = {
  id: string;
  title: string;
  title_ta?: string;
  description: string;
  event_date: string;
  start_date?: string;
  end_date?: string;
  category?: "academics" | "non-academics" | "sports" | "general";
  event_time: string;
  venue: string;
  subject?: string;
  event_kind?: string;
  eligibility?: string;
  target_class?: string;
  district?: string;
  registration_url?: string;
};

export type Notice = {
  id: string;
  title: string;
  message: string;
  target_type: string;
  target_value?: string | null;
  created_at: string;
  read_status?: boolean;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  user_name: string;
  school_name: string;
  district: string;
  class?: string | null;
  event_type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type FeedbackItem = {
  id: string;
  student_id: string;
  category: string;
  message: string;
  status: string;
  response?: string;
  district?: string;
  created_at: string;
};

export type MockAccount = {
  key: string;
  email: string;
  password: string;
  role: Role;
  profile: Profile;
};

const now = new Date().toISOString();

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    key: "kavi",
    email: "kavi@kalvi.test",
    password: "student123",
    role: "student",
    profile: {
      id: "demo-kavi",
      full_name: "Kavi",
      emis_number: "demo-kavi",
      mobile_number: "9000010001",
      district: "Chennai",
      school_name: "Chennai Primary School, Saidapet",
      class: "5",
      section: "A",
      language_preference: "ta",
    },
  },
  {
    key: "arun",
    email: "arun@kalvi.test",
    password: "student123",
    role: "student",
    profile: {
      id: "demo-arun",
      full_name: "Arun",
      emis_number: "demo-arun",
      mobile_number: "9000010002",
      district: "Madurai",
      school_name: "Government Higher Secondary School, Madurai",
      class: "10",
      section: "B",
      language_preference: "ta",
    },
  },
  {
    key: "arul",
    email: "arul@kalvi.test",
    password: "student123",
    role: "student",
    profile: {
      id: "demo-arul",
      full_name: "Arul",
      emis_number: "demo-arul",
      mobile_number: "9000010003",
      district: "Coimbatore",
      school_name: "Government Girls HSS, Coimbatore",
      class: "12",
      section: "C",
      language_preference: "en",
    },
  },
  {
    key: "mockid",
    email: "student.mockid@samacheer.app",
    password: "student123",
    role: "student",
    profile: {
      id: "mock-student-10",
      full_name: "கவி அருள்",
      emis_number: "mockid",
      mobile_number: "9876543210",
      district: "Madurai",
      school_name: "Government Higher Secondary School, Madurai",
      class: "10",
      section: "A",
      language_preference: "ta",
    },
  },
  {
    key: "mock5",
    email: "student.mock5@samacheer.app",
    password: "student123",
    role: "student",
    profile: {
      id: "mock-student-5",
      full_name: "யாழினி",
      emis_number: "mock5",
      mobile_number: "9876500005",
      district: "Chennai",
      school_name: "Chennai Primary School, Saidapet",
      class: "5",
      section: "B",
      language_preference: "ta",
    },
  },
  {
    key: "mock12",
    email: "student.mock12@samacheer.app",
    password: "student123",
    role: "student",
    profile: {
      id: "mock-student-12",
      full_name: "Nila Kumar",
      emis_number: "mock12",
      mobile_number: "9876500012",
      district: "Coimbatore",
      school_name: "Government Girls HSS, Coimbatore",
      class: "12",
      section: "C",
      language_preference: "en",
    },
  },
];

export const MOCK_SCHOOLS = [
  {
    id: "school-1",
    name: "Government Higher Secondary School, Madurai",
    district: "Madurai",
    type: "Government",
  },
  {
    id: "school-2",
    name: "Chennai Primary School, Saidapet",
    district: "Chennai",
    type: "Government",
  },
  {
    id: "school-3",
    name: "Government Girls HSS, Coimbatore",
    district: "Coimbatore",
    type: "Government",
  },
  {
    id: "school-4",
    name: "Panchayat Union Middle School, Salem",
    district: "Salem",
    type: "Government",
  },
  {
    id: "school-5",
    name: "Municipal Higher Secondary School, Tirunelveli",
    district: "Tirunelveli",
    type: "Government",
  },
  {
    id: "school-6",
    name: "Aided Higher Secondary School, Trichy",
    district: "Tiruchirappalli",
    type: "Aided",
  },
  {
    id: "school-7",
    name: "Aided Girls Higher Secondary School, Chennai",
    district: "Chennai",
    type: "Aided",
  },
];

const publicPdf = "https://www.tntextbooks.in/p/school-books.html";
const guideUrl = "https://www.kalviexpress.in/";
const papersUrl = "https://dge.tn.gov.in/";

export const SEED_MATERIALS: Material[] = [
  {
    id: "m5-tamil-text",
    title: "Class 5 Tamil Textbook",
    title_ta: "வகுப்பு 5 தமிழ் பாடநூல்",
    class: "5",
    subject: "Tamil",
    subject_ta: "தமிழ்",
    chapter: "Term 1",
    type: "textbook",
    language: "ta",
    medium: "Tamil",
    url: publicPdf,
    source: "TN Textbooks",
    created_at: now,
  },
  {
    id: "m5-math-guide",
    title: "Class 5 Maths Guide",
    title_ta: "வகுப்பு 5 கணிதம் வழிகாட்டி",
    class: "5",
    subject: "Mathematics",
    subject_ta: "கணிதம்",
    chapter: "Numbers",
    type: "guide",
    language: "ta",
    medium: "Tamil",
    url: guideUrl,
    source: "Public guide link",
    created_at: now,
  },
  {
    id: "m5-evs-bookback",
    title: "Class 5 EVS Book Back Answers",
    title_ta: "வகுப்பு 5 சுற்றுச்சூழல் பின்விடைகள்",
    class: "5",
    subject: "EVS",
    subject_ta: "சுற்றுச்சூழல்",
    chapter: "Plants",
    type: "book_back",
    language: "ta",
    medium: "Tamil",
    url: guideUrl,
    source: "Public notes",
    created_at: now,
  },
  {
    id: "m5-worksheet",
    title: "Class 5 Practice Worksheet",
    title_ta: "வகுப்பு 5 பயிற்சி தாள்",
    class: "5",
    subject: "English",
    subject_ta: "ஆங்கிலம்",
    chapter: "Grammar",
    type: "worksheet",
    language: "en",
    medium: "English",
    url: guideUrl,
    source: "Public worksheet",
    created_at: now,
  },
  {
    id: "m10-science-text",
    title: "Class 10 Science Textbook",
    title_ta: "வகுப்பு 10 அறிவியல் பாடநூல்",
    class: "10",
    subject: "Science",
    subject_ta: "அறிவியல்",
    chapter: "Electricity",
    type: "textbook",
    language: "ta",
    medium: "Tamil",
    url: publicPdf,
    source: "TN Textbooks",
    created_at: now,
  },
  {
    id: "m10-math-bookback",
    title: "Class 10 Maths Book Back Answers",
    title_ta: "வகுப்பு 10 கணிதம் பின்விடைகள்",
    class: "10",
    subject: "Mathematics",
    subject_ta: "கணிதம்",
    chapter: "Algebra",
    type: "book_back",
    language: "ta",
    medium: "Tamil",
    url: guideUrl,
    source: "Public notes",
    created_at: now,
  },
  {
    id: "m10-model-paper",
    title: "Class 10 Model Question Paper",
    title_ta: "வகுப்பு 10 மாதிரி வினாத்தாள்",
    class: "10",
    subject: "Social Science",
    subject_ta: "சமூக அறிவியல்",
    chapter: "Public Exam",
    type: "model_paper",
    language: "en",
    medium: "English",
    url: papersUrl,
    source: "DGE Tamil Nadu",
    created_at: now,
  },
  {
    id: "m10-revision",
    title: "Class 10 Revision Notes",
    title_ta: "வகுப்பு 10 மீளாய்வு குறிப்புகள்",
    class: "10",
    subject: "English",
    subject_ta: "ஆங்கிலம்",
    chapter: "Poetry",
    type: "revision_pdf",
    language: "en",
    medium: "English",
    url: guideUrl,
    source: "Public revision link",
    created_at: now,
  },
  {
    id: "m12-physics-text",
    title: "Class 12 Physics Textbook",
    title_ta: "வகுப்பு 12 இயற்பியல் பாடநூல்",
    class: "12",
    subject: "Physics",
    subject_ta: "இயற்பியல்",
    chapter: "Electrostatics",
    type: "textbook",
    language: "ta",
    medium: "Tamil",
    url: publicPdf,
    source: "TN Textbooks",
    created_at: now,
  },
  {
    id: "m12-chem-important",
    title: "Class 12 Chemistry Important Questions",
    title_ta: "வகுப்பு 12 வேதியியல் முக்கிய வினாக்கள்",
    class: "12",
    subject: "Chemistry",
    subject_ta: "வேதியியல்",
    chapter: "Organic Chemistry",
    type: "important_questions",
    language: "ta",
    medium: "Tamil",
    url: guideUrl,
    source: "Public questions",
    created_at: now,
  },
  {
    id: "m12-biology-prev",
    title: "Class 12 Biology Previous Year Paper",
    title_ta: "வகுப்பு 12 உயிரியல் முந்தைய வினாத்தாள்",
    class: "12",
    subject: "Biology",
    subject_ta: "உயிரியல்",
    chapter: "Public Exam",
    type: "previous_year",
    language: "en",
    medium: "English",
    url: papersUrl,
    source: "DGE Tamil Nadu",
    created_at: now,
  },
  {
    id: "m12-revision",
    title: "Class 12 Public Exam Revision",
    title_ta: "வகுப்பு 12 பொதுத்தேர்வு மீளாய்வு",
    class: "12",
    subject: "Mathematics",
    subject_ta: "கணிதம்",
    chapter: "Calculus",
    type: "revision_pdf",
    language: "en",
    medium: "English",
    url: guideUrl,
    source: "Public revision link",
    created_at: now,
  },
];

export const SEED_VIDEOS: Video[] = [
  {
    id: "v5-math",
    title: "Class 5 Maths Lesson",
    title_ta: "வகுப்பு 5 கணிதப் பாடம்",
    class: "5",
    subject: "Mathematics",
    subject_ta: "கணிதம்",
    chapter: "Fractions",
    url: "https://www.youtube.com/watch?v=2UrcUfBizyw",
    source: "YouTube / Kalvi TV",
    duration_minutes: 18,
    created_at: now,
  },
  {
    id: "v10-science",
    title: "Class 10 Science Electricity",
    title_ta: "வகுப்பு 10 அறிவியல் மின்சாரம்",
    class: "10",
    subject: "Science",
    subject_ta: "அறிவியல்",
    chapter: "Electricity",
    url: "https://www.youtube.com/watch?v=VMS1gNnp_zs",
    source: "YouTube / Kalvi TV",
    duration_minutes: 24,
    created_at: now,
  },
  {
    id: "v10-social",
    title: "Class 10 Social Science Revision",
    title_ta: "வகுப்பு 10 சமூக அறிவியல் மீளாய்வு",
    class: "10",
    subject: "Social Science",
    subject_ta: "சமூக அறிவியல்",
    chapter: "History",
    url: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    source: "YouTube",
    duration_minutes: 15,
    created_at: now,
  },
  {
    id: "v12-physics",
    title: "Class 12 Physics Electrostatics",
    title_ta: "வகுப்பு 12 இயற்பியல் மின்னியல்",
    class: "12",
    subject: "Physics",
    subject_ta: "இயற்பியல்",
    chapter: "Electrostatics",
    url: "https://www.youtube.com/watch?v=H14bBuluwB8",
    source: "YouTube / SWAYAM style embed",
    duration_minutes: 32,
    created_at: now,
  },
];

export const SEED_EVENTS: EventItem[] = [
  {
    id: "academic-term1-10",
    category: "academics",
    title: "Class 10 Term 1 Exam",
    title_ta: "வகுப்பு 10 முதலாம் பருவத் தேர்வு",
    description: "Five-day written exam covering Tamil, English, Mathematics, Science, and Social Science.",
    subject: "Tamil, English, Mathematics, Science, Social Science",
    event_date: "2026-06-01",
    start_date: "2026-06-01",
    end_date: "2026-06-05",
    event_time: "09:30 AM - 12:30 PM",
    venue: "Government Higher Secondary School, Madurai",
    event_kind: "Term 1 Exam",
    eligibility: "Class 10",
    target_class: "10",
    district: "Tamil Nadu",
  },
  {
    id: "academic-quarterly-5",
    category: "academics",
    title: "Class 5 Quarterly Exam",
    title_ta: "வகுப்பு 5 காலாண்டுத் தேர்வு",
    description: "Quarterly assessment for primary school students with core subjects.",
    subject: "Tamil, English, Mathematics, Environmental Studies",
    event_date: "2026-07-20",
    start_date: "2026-07-20",
    end_date: "2026-07-23",
    event_time: "10:00 AM - 12:00 PM",
    venue: "Chennai Primary School, Saidapet",
    event_kind: "Quarterly Exam",
    eligibility: "Class 5",
    target_class: "5",
    district: "Tamil Nadu",
  },
  {
    id: "academic-unittest-8",
    category: "academics",
    title: "Class 8 Unit Test",
    title_ta: "வகுப்பு 8 அலகுத் தேர்வு",
    description: "Short unit tests to review lessons completed in the current term.",
    subject: "Tamil, English, Mathematics, Science",
    event_date: "2026-08-04",
    start_date: "2026-08-04",
    end_date: "2026-08-05",
    event_time: "09:45 AM - 11:45 AM",
    venue: "Government Girls HSS, Coimbatore",
    event_kind: "Unit Test",
    eligibility: "Class 8",
    target_class: "8",
    district: "Tamil Nadu",
  },
  {
    id: "academic-halfyearly-12",
    category: "academics",
    title: "Class 12 Half-Yearly Exam",
    title_ta: "வகுப்பு 12 அரை ஆண்டுத் தேர்வு",
    description: "Board-pattern half-yearly exam for higher secondary students.",
    subject: "Physics, Chemistry, Mathematics, Biology, Commerce",
    event_date: "2026-10-12",
    start_date: "2026-10-12",
    end_date: "2026-10-18",
    event_time: "09:00 AM - 12:00 PM",
    venue: "Government HSS, Tiruchirappalli",
    event_kind: "Half-Yearly Exam",
    eligibility: "Class 12",
    target_class: "12",
    district: "Tamil Nadu",
  },
  {
    id: "academic-revision-10",
    category: "academics",
    title: "Class 10 Revision Test",
    title_ta: "வகுப்பு 10 மீளாய்வு தேர்வு",
    description: "Revision tests before the term-end exam with chapter-wise practice.",
    subject: "Science, Mathematics, Social Science",
    event_date: "2026-11-30",
    start_date: "2026-11-30",
    end_date: "2026-12-02",
    event_time: "09:30 AM - 11:30 AM",
    venue: "Government HSS, Salem",
    event_kind: "Revision Test",
    eligibility: "Class 10",
    target_class: "10",
    district: "Tamil Nadu",
  },
  {
    id: "academic-model-12",
    category: "academics",
    title: "Class 12 Model Exam",
    title_ta: "வகுப்பு 12 மாதிரி தேர்வு",
    description: "Full-syllabus model exam to prepare students for public examinations.",
    subject: "Physics, Chemistry, Accountancy, Computer Science",
    event_date: "2026-12-14",
    start_date: "2026-12-14",
    end_date: "2026-12-18",
    event_time: "09:00 AM - 12:00 PM",
    venue: "Government Girls HSS, Coimbatore",
    event_kind: "Model Exam",
    eligibility: "Class 12",
    target_class: "12",
    district: "Tamil Nadu",
  },
  {
    id: "academic-term2-10",
    category: "academics",
    title: "Class 10 Term 2 Exam",
    title_ta: "வகுப்பு 10 இரண்டாம் பருவத் தேர்வு",
    description: "Second term examination for Class 10 with core subject papers.",
    subject: "Tamil, English, Mathematics, Science, Social Science",
    event_date: "2026-03-02",
    start_date: "2026-03-02",
    end_date: "2026-03-06",
    event_time: "09:30 AM - 12:30 PM",
    venue: "Government Higher Secondary School, Madurai",
    event_kind: "Term 2 Exam",
    eligibility: "Class 10",
    target_class: "10",
    district: "Tamil Nadu",
  },
  {
    id: "academic-may-revision",
    category: "academics",
    title: "Class 10 Revision Test",
    title_ta: "வகுப்பு 10 மீளாய்வு தேர்வு",
    description: "Revision test for the May unit with quick practice on core subjects.",
    subject: "Tamil, English, Mathematics, Science",
    event_date: "2026-05-24",
    start_date: "2026-05-24",
    end_date: "2026-05-24",
    event_time: "09:30 AM - 12:00 PM",
    venue: "Government Higher Secondary School, Madurai",
    event_kind: "Revision Test",
    eligibility: "Class 10",
    target_class: "10",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-speech",
    category: "non-academics",
    title: "Speech Competition",
    title_ta: "பேச்சுப் போட்டி",
    description: "Students speak on civic values, learning habits, and school safety.",
    event_date: "2026-07-09",
    start_date: "2026-07-09",
    end_date: "2026-07-09",
    event_time: "10:00 AM - 12:00 PM",
    venue: "District Resource Centre, Madurai",
    event_kind: "Competition",
    eligibility: "Classes 5 to 12",
    target_class: "5,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-speech-may",
    category: "non-academics",
    title: "Speech Competition",
    title_ta: "பேச்சுப் போட்டி",
    description: "School speech competition on civic values and student safety.",
    event_date: "2026-05-25",
    start_date: "2026-05-25",
    end_date: "2026-05-25",
    event_time: "10:00 AM - 11:30 AM",
    venue: "District Resource Centre, Madurai",
    event_kind: "Competition",
    eligibility: "Classes 5 to 12",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-essay",
    category: "non-academics",
    title: "Essay Writing Competition",
    title_ta: "கட்டுரை எழுதும் போட்டி",
    description: "Essay writing on environment, health, and public awareness themes.",
    event_date: "2026-08-01",
    start_date: "2026-08-01",
    end_date: "2026-08-02",
    event_time: "11:00 AM - 12:30 PM",
    venue: "Government HSS, Tirunelveli",
    event_kind: "Competition",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-debate",
    category: "non-academics",
    title: "Debate Competition",
    title_ta: "வாதப்போட்டி",
    description: "Debates on student wellbeing, digital learning, and community development.",
    event_date: "2026-08-22",
    start_date: "2026-08-22",
    end_date: "2026-08-23",
    event_time: "02:00 PM - 04:00 PM",
    venue: "Government Boys HSS, Chennai",
    event_kind: "Competition",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-science-expo",
    category: "non-academics",
    title: "Science Exhibition",
    title_ta: "அறிவியல் கண்காட்சி",
    description: "Student models, working exhibits, and project displays from nearby schools.",
    event_date: "2026-09-03",
    start_date: "2026-09-03",
    end_date: "2026-09-05",
    event_time: "10:00 AM - 04:00 PM",
    venue: "Government HSS, Coimbatore",
    event_kind: "Exhibition",
    eligibility: "Classes 5, 8, 10, 12",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-cultural",
    category: "non-academics",
    title: "Cultural Events",
    title_ta: "கலை மற்றும் பண்பாட்டு நிகழ்வுகள்",
    description: "Folk dance, singing, and literary presentations by school teams.",
    event_date: "2026-10-15",
    start_date: "2026-10-15",
    end_date: "2026-10-17",
    event_time: "01:30 PM - 04:30 PM",
    venue: "District Sports Complex, Salem",
    event_kind: "Festival Programme",
    eligibility: "All classes",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-awareness",
    category: "non-academics",
    title: "Awareness Programs",
    title_ta: "விழிப்புணர்வு நிகழ்ச்சிகள்",
    description: "Programs on safety, health, environment, and responsible digital use.",
    event_date: "2026-11-11",
    start_date: "2026-11-11",
    end_date: "2026-11-12",
    event_time: "10:30 AM - 12:00 PM",
    venue: "Panchayat Union Middle School, Salem",
    event_kind: "Awareness Programme",
    eligibility: "Classes 5 to 12",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "nonacad-club",
    category: "non-academics",
    title: "Club Activities",
    title_ta: "கிளப் செயல்பாடுகள்",
    description: "Literature, science, eco-club, and reading-circle activities.",
    event_date: "2026-12-05",
    start_date: "2026-12-05",
    end_date: "2026-12-06",
    event_time: "03:00 PM - 04:30 PM",
    venue: "Government Girls HSS, Madurai",
    event_kind: "Club Activity",
    eligibility: "Classes 5 to 12",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-annual-day",
    category: "sports",
    title: "Annual Sports Day",
    title_ta: "ஆண்டு விளையாட்டு விழா",
    description: "Opening march past, track events, and finals for school athletes.",
    event_date: "2026-01-16",
    start_date: "2026-01-16",
    end_date: "2026-01-17",
    event_time: "08:30 AM - 04:00 PM",
    venue: "Jawaharlal Nehru Stadium, Chennai",
    event_kind: "Sports Day",
    eligibility: "All classes",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-cricket",
    category: "sports",
    title: "Cricket Tournament",
    title_ta: "கிரிக்கெட் போட்டி",
    description: "Inter-school cricket league matches and semi-finals.",
    event_date: "2026-07-28",
    start_date: "2026-07-28",
    end_date: "2026-07-31",
    event_time: "09:00 AM - 05:00 PM",
    venue: "District Stadium, Madurai",
    event_kind: "Tournament",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-football",
    category: "sports",
    title: "Football Tournament",
    title_ta: "கால்பந்து போட்டி",
    description: "Knockout football matches between school teams.",
    event_date: "2026-08-11",
    start_date: "2026-08-11",
    end_date: "2026-08-13",
    event_time: "04:00 PM - 06:30 PM",
    venue: "Government HSS Ground, Tiruchirappalli",
    event_kind: "Tournament",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-may-practice",
    category: "sports",
    title: "Athletics Practice",
    title_ta: "தடகளப் பயிற்சி",
    description: "Practice sessions for relay, sprint, and field events.",
    event_date: "2026-05-26",
    start_date: "2026-05-26",
    end_date: "2026-05-26",
    event_time: "06:30 AM - 08:00 AM",
    venue: "Coimbatore Sports Ground, Coimbatore",
    event_kind: "Practice",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-athletics-practice",
    category: "sports",
    title: "Athletics Practice",
    title_ta: "தடகளப் பயிற்சி",
    description: "Practice sessions for sprint, relay, and field events.",
    event_date: "2026-09-01",
    start_date: "2026-09-01",
    end_date: "2026-09-05",
    event_time: "06:30 AM - 08:00 AM",
    venue: "Coimbatore Sports Ground, Coimbatore",
    event_kind: "Practice",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-kabaddi",
    category: "sports",
    title: "Kabaddi Matches",
    title_ta: "கபடி போட்டிகள்",
    description: "Inter-school kabaddi matches with zone-wise fixtures.",
    event_date: "2026-10-07",
    start_date: "2026-10-07",
    end_date: "2026-10-09",
    event_time: "03:30 PM - 05:30 PM",
    venue: "School Sports Complex, Salem",
    event_kind: "Match",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-yoga-day",
    category: "sports",
    title: "Yoga Day Activities",
    title_ta: "யோகா நாள் செயல்பாடுகள்",
    description: "Common yoga sessions, breathing exercises, and wellness routines.",
    event_date: "2026-06-20",
    start_date: "2026-06-20",
    end_date: "2026-06-21",
    event_time: "07:00 AM - 08:30 AM",
    venue: "Government HSS, Tirunelveli",
    event_kind: "Wellness Activity",
    eligibility: "All classes",
    target_class: "5,8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "sports-zonal",
    category: "sports",
    title: "Zonal Competitions",
    title_ta: "மண்டல விளையாட்டுப் போட்டிகள்",
    description: "Zone-level athletics, kabaddi, and team events for selected students.",
    event_date: "2026-07-12",
    start_date: "2026-07-12",
    end_date: "2026-07-13",
    event_time: "09:00 AM - 05:00 PM",
    venue: "District Stadium, Madurai",
    event_kind: "Zonal Meet",
    eligibility: "Classes 8 to 12",
    target_class: "8,10,12",
    district: "Tamil Nadu",
  },
  {
    id: "general-pongal",
    category: "general",
    title: "Pongal",
    title_ta: "பொங்கல்",
    description: "Tamil festival holiday celebrating the harvest season.",
    event_date: "2026-01-14",
    start_date: "2026-01-14",
    end_date: "2026-01-16",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Tamil Festival Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-republic-day",
    category: "general",
    title: "Republic Day",
    title_ta: "குடியரசு தினம்",
    description: "National holiday marking the adoption of the Constitution.",
    event_date: "2026-01-26",
    start_date: "2026-01-26",
    end_date: "2026-01-26",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Government Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-bakrid",
    category: "general",
    title: "Bakrid",
    title_ta: "பக்ரீத்",
    description: "Festival holiday observed across many schools and districts.",
    event_date: "2026-05-28",
    start_date: "2026-05-28",
    end_date: "2026-05-28",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Religious Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-independence-day",
    category: "general",
    title: "Independence Day",
    title_ta: "சுதந்திர தினம்",
    description: "National holiday with flag hoisting and cultural programmes.",
    event_date: "2026-08-15",
    start_date: "2026-08-15",
    end_date: "2026-08-15",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Government Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-gandhi-jayanthi",
    category: "general",
    title: "Gandhi Jayanthi",
    title_ta: "காந்தி ஜெயந்தி",
    description: "Holiday observed to honour Mahatma Gandhi.",
    event_date: "2026-10-02",
    start_date: "2026-10-02",
    end_date: "2026-10-02",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Government Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-ayudha-pooja",
    category: "general",
    title: "Ayudha Pooja",
    title_ta: "ஆயுத பூஜை",
    description: "Festival holiday before Vijayadashami celebrations.",
    event_date: "2026-10-19",
    start_date: "2026-10-19",
    end_date: "2026-10-20",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Tamil Festival Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-deepavali",
    category: "general",
    title: "Deepavali",
    title_ta: "தீபாவளி",
    description: "Festival holiday celebrated with lights and family gatherings.",
    event_date: "2026-11-08",
    start_date: "2026-11-08",
    end_date: "2026-11-10",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Tamil Festival Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-ramzan",
    category: "general",
    title: "Ramzan",
    title_ta: "ரம்சான்",
    description: "Festival holiday observed after the month of fasting.",
    event_date: "2026-03-21",
    start_date: "2026-03-21",
    end_date: "2026-03-21",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Religious Holiday",
    district: "Tamil Nadu",
  },
  {
    id: "general-christmas",
    category: "general",
    title: "Christmas",
    title_ta: "கிறிஸ்துமஸ்",
    description: "Holiday observed with school closures and festive programmes.",
    event_date: "2026-12-24",
    start_date: "2026-12-24",
    end_date: "2026-12-26",
    event_time: "All day",
    venue: "Tamil Nadu",
    event_kind: "Government Holiday",
    district: "Tamil Nadu",
  },
];

export const SEED_NOTIFICATIONS: Notice[] = [
  {
    id: "notice-rain",
    title: "Rain Leave Alert",
    message: "Check district notices for rain leave updates before travelling to school.",
    target_type: "district",
    target_value: "Madurai",
    created_at: now,
    read_status: false,
  },
  {
    id: "notice-upload",
    title: "New Class 10 Materials",
    message: "Science revision notes and model papers were added.",
    target_type: "class",
    target_value: "10",
    created_at: now,
    read_status: false,
  },
  {
    id: "notice-scholarship",
    title: "Scholarship Notice",
    message: "Scholarship application window is open for eligible students.",
    target_type: "all",
    created_at: now,
    read_status: true,
  },
];

export const SEED_ACTIVITY: ActivityLog[] = [
  {
    id: "act-1",
    user_id: "mock-student-10",
    user_name: "கவி அருள்",
    school_name: "Government Higher Secondary School, Madurai",
    district: "Madurai",
    class: "10",
    event_type: "login",
    created_at: now,
    metadata: { mock: true },
  },
  {
    id: "act-2",
    user_id: "mock-student-5",
    user_name: "யாழினி",
    school_name: "Chennai Primary School, Saidapet",
    district: "Chennai",
    class: "5",
    event_type: "pdf_open",
    created_at: now,
    metadata: { material: "Class 5 Tamil Textbook" },
  },
];

export const SEED_FEEDBACK: FeedbackItem[] = [
  {
    id: "fb-1",
    student_id: "mock-student-10",
    category: "content",
    message: "Class 10 Maths guide link needs chapter-wise labels.",
    status: "open",
    district: "Madurai",
    created_at: now,
  },
];

function key(name: string) {
  return `kalvi_${name}`;
}

export function getLocalItems<T>(name: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(key(name));
  if (!raw) return seed;
  try {
    return [...JSON.parse(raw), ...seed] as T[];
  } catch {
    return seed;
  }
}

export function addLocalItem<T extends { id: string }>(name: string, item: T) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(key(name));
  const existing = raw ? JSON.parse(raw) : [];
  localStorage.setItem(key(name), JSON.stringify([item, ...existing]));
  window.dispatchEvent(new CustomEvent(`kalvi:${name}`, { detail: item }));
}

export function updateLocalItem<T extends { id: string }>(
  name: string,
  id: string,
  patch: Partial<T>,
) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(key(name));
  const existing = raw ? JSON.parse(raw) : [];
  localStorage.setItem(
    key(name),
    JSON.stringify(existing.map((item: T) => (item.id === id ? { ...item, ...patch } : item))),
  );
  window.dispatchEvent(new CustomEvent(`kalvi:${name}`, { detail: { id, patch } }));
}

export function deleteLocalItem(name: string, id: string) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(key(name));
  const existing = raw ? JSON.parse(raw) : [];
  localStorage.setItem(
    key(name),
    JSON.stringify(existing.filter((item: { id: string }) => item.id !== id)),
  );
  window.dispatchEvent(new CustomEvent(`kalvi:${name}`, { detail: { id } }));
}

export function findMockStudent(mobile: string, password?: string) {
  const normalized = mobile.replace(/\D/g, "");
  return MOCK_ACCOUNTS.find((a) => {
    if (a.role !== "student") return false;
    const mobileMatch =
      a.profile.mobile_number?.replace(/\D/g, "") === normalized ||
      a.key.toLowerCase() === mobile.trim().toLowerCase();
    return mobileMatch && (!password || a.password === password);
  });
}

export function logMockActivity(
  profile: Profile,
  event_type = "login",
  metadata: Record<string, unknown> = {},
) {
  const row: ActivityLog = {
    id: `mock-activity-${Date.now()}`,
    user_id: profile.id,
    user_name: profile.full_name,
    school_name: profile.school_name ?? "State office",
    district: profile.district ?? "Tamil Nadu",
    class: profile.class,
    event_type,
    metadata: { mock: true, ...metadata },
    created_at: new Date().toISOString(),
  };
  addLocalItem("activity", row);
  return row;
}
