import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { type MockAccount } from "@/lib/mock-data";
import { apiRequest, STUDENT_AUTH_KEY, type ApiRowResponse } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export type Role = "student" | "teacher" | "district_admin" | "super_admin";

export interface Profile {
  id: string;
  full_name: string;
  emis_number: string | null;
  mobile_number?: string | null;
  district: string | null;
  school_name: string | null;
  class: string | null;
  section: string | null;
  language_preference: string;
  location_label?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  location_place_id?: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  mock: boolean;
  setMockAccount: (account: MockAccount) => void;
  setStudentAuth: (token: string, student: Profile) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function profileUser(profile: Profile): User {
  return {
    id: profile.id,
    app_metadata: {},
    user_metadata: { full_name: profile.full_name },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: profile.mobile_number ? `student.${profile.mobile_number}@kalvi.local` : undefined,
  } as User;
}

function profileSession(token: string, profile: Profile): Session {
  const user = profileUser(profile);
  return {
    access_token: token,
    refresh_token: "",
    expires_in: 60 * 60 * 24,
    token_type: "bearer",
    user,
  } as Session;
}

function getStoredStudentAuth() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STUDENT_AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token: string; student: Profile };
    if (parsed?.token && parsed?.student?.id) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState(false);

  const setMockAccount = (account: MockAccount) => {
    setStudentAuth(`mock-${account.key}`, account.profile);
  };

  const setStudentAuth = (token: string, student: Profile) => {
    localStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify({ token, student }));
    setSession(profileSession(token, student));
    setProfile(student);
    setRole("student");
    setMock(false);
  };

  const loadProfile = async () => {
    const response = await apiRequest<ApiRowResponse<Profile>>("/api/students/me");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? getStoredStudentAuth()?.token ?? "";
    localStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify({ token, student: response.data }));
    setSession(profileSession(token, response.data));
    setProfile(response.data);
    setRole("student");
  };

  const refresh = async () => {
    if (getStoredStudentAuth()) await loadProfile();
  };

  useEffect(() => {
    const auth = getStoredStudentAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    setSession(profileSession(auth.token, auth.student));
    setProfile(auth.student);
    setRole("student");
    loadProfile().catch(() => {
      localStorage.removeItem(STUDENT_AUTH_KEY);
      setSession(null);
      setProfile(null);
      setRole(null);
    }).finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.removeItem(STUDENT_AUTH_KEY);
    setSession(null);
    setProfile(null);
    setRole(null);
    setMock(false);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        loading,
        mock,
        setMockAccount,
        setStudentAuth,
        signOut,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function mobileToPhone(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
}

export function mobileToEmail(mobile: string): string {
  return `student.${mobile.replace(/\D/g, "")}@samacheer.app`;
}

export function isValidMobile(mobile: string): boolean {
  const digits = mobile.replace(/\D/g, "");
  // Accept 10-digit local numbers (e.g. 9876543210)
  // or 12-digit numbers that start with country code 91 (e.g. 919876543210)
  return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
}
