export const FEEDBACK_CATEGORIES = [
  { key: "students", en: "Students", ta: "மாணவர்கள்" },
  { key: "teachers", en: "Teachers", ta: "ஆசிரியர்கள்" },
  { key: "sports", en: "Sports", ta: "கேளிக்கை" },
  { key: "academics", en: "Academics", ta: "கல்வி" },
  { key: "facilities", en: "Facilities", ta: "அணுகல்" },
  { key: "exams", en: "Exams", ta: "தேர்வுகள்" },
  { key: "other", en: "Other", ta: "மற்றவை" },
];

export const FEEDBACK_ROLES = [
  { key: "student", en: "Student", ta: "மாணவர்" },
  { key: "teacher", en: "Teacher", ta: "ஆசிரியர்" },
  { key: "parent", en: "Parent", ta: "பெற்றோர்" },
  { key: "admin", en: "Admin", ta: "நிர்வாகி" },
];

export function labelForCategory(key: string, lang: string) {
  const c = FEEDBACK_CATEGORIES.find((x) => x.key === key);
  if (!c) return key;
  return lang === "ta" ? c.ta : c.en;
}

export function labelForRole(key: string, lang: string) {
  const r = FEEDBACK_ROLES.find((x) => x.key === key);
  if (!r) return key;
  return lang === "ta" ? r.ta : r.en;
}
