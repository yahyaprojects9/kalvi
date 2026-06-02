import type { EventItem, Notice } from "@/lib/mock-data";
import type { Profile, Role } from "@/lib/auth-context";

export function isStudent(role: Role | null | undefined) {
  return role === "student";
}

export function normalizeClassValue(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.toString().trim().toLowerCase().replace(/\s+/g, "");
  const digits = normalized.match(/\d+/)?.[0];
  return digits ?? normalized;
}

export function classesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const classA = normalizeClassValue(a);
  const classB = normalizeClassValue(b);
  if (!classA || !classB) return false;
  return classA === classB;
}

export function filterByStudentClass<T extends { class?: string | null }>(
  items: T[],
  profile: Profile | null | undefined,
  role: Role | null | undefined,
) {
  if (!isStudent(role) || !profile?.class) return items;
  return items.filter((item) => classesMatch(item.class, profile.class));
}

export function eventVisibleToProfile(
  event: Pick<EventItem, "target_class" | "district">,
  profile: Profile | null | undefined,
  role: Role | null | undefined,
) {
  if (!isStudent(role)) return true;
  const profileClass = normalizeClassValue(profile?.class);
  const classOk =
    !event.target_class ||
    !profileClass ||
    event.target_class
      .split(",")
      .map((value) => normalizeClassValue(value))
      .includes(profileClass);
  const districtOk =
    !event.district ||
    event.district === "Tamil Nadu" ||
    !profile?.district ||
    event.district === profile.district;
  return classOk && districtOk;
}

export function notificationVisibleToProfile(
  notice: Pick<Notice, "target_type" | "target_value">,
  profile: Profile | null | undefined,
  role: Role | null | undefined,
) {
  if (!isStudent(role)) return true;
  if (notice.target_type === "all") return true;
  if (notice.target_type === "class") return classesMatch(notice.target_value, profile?.class);
  if (notice.target_type === "district") return notice.target_value === profile?.district;
  if (notice.target_type === "school") return notice.target_value === profile?.school_name;
  return false;
}
