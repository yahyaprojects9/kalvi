import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/lib/lang-context";
import { useAuth, isValidMobile, type Profile } from "@/lib/auth-context";
import { toast } from "sonner";
import { LangToggle } from "@/components/lang-toggle";
import { ArrowLeft } from "lucide-react";
import { deriveLocalizedName, saveLocalizedName } from "@/lib/name-localization";
import { GovFooter, GovIdentity } from "@/components/gov-brand";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul",
  "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai",
  "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
  "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur",
  "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
];

function SignupPage() {
  const { t } = useLang();
  const { setStudentAuth } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [district, setDistrict] = useState("");
  const [school, setSchool] = useState("");
  const [klass, setKlass] = useState("");
  const [classError, setClassError] = useState("");

  const selectedSchool = school.trim();
  const resolvedName = name.trim();
  const classValidationMessage = t("classMustBeLkgUkgOr112");

  const isValidClass = (classValue: string): boolean => {
    const value = classValue.trim().toUpperCase();
    if (value === "LKG" || value === "UKG") return true;
    if (!/^\d+$/.test(value)) return false;
    const numericClass = Number(value);
    return numericClass >= 1 && numericClass <= 12;
  };

  const handleClassChange = (value: string) => {
    const nextValue = value.trim().toUpperCase();
    if (!nextValue) {
      setKlass("");
      setClassError("");
      return;
    }

    const isTextClass = ["L", "LK", "LKG", "U", "UK", "UKG"].includes(nextValue);
    const isNumericClass = /^\d+$/.test(nextValue) && Number(nextValue) >= 1 && Number(nextValue) <= 12;
    if (isTextClass || isNumericClass) {
      setKlass(nextValue);
      setClassError(isValidClass(nextValue) ? "" : classValidationMessage);
      return;
    }
    setClassError(classValidationMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedName || !gender || !mobile || !district || !selectedSchool || !klass) {
      toast.error(t("fillAllRequiredFields"));
      return;
    }
    if (!isValidClass(klass)) {
      setClassError(classValidationMessage);
      toast.error(classValidationMessage);
      return;
    }
    if (!isValidMobile(mobile)) {
      toast.error(t("enterValidMobileNumber"));
      return;
    }
    const authPassword = password.trim();
    if (authPassword.length < 6) {
      toast.error(t("passwordMinSix"));
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: {
          full_name: resolvedName,
          gender,
          mobile_number: mobile,
          password: authPassword,
          school_name: selectedSchool,
          class: klass,
          district,
        },
      });
      const login = await apiRequest<{ data: { token: string; student: Profile } }>("/api/auth/login", {
        method: "POST",
        body: {
          mobile_number: mobile,
          password: authPassword,
        },
      });
      const localizedName = deriveLocalizedName(resolvedName);
      saveLocalizedName(login.data.student.id, localizedName);
      saveLocalizedName(mobile, localizedName);
      setStudentAuth(login.data.token, login.data.student);
      toast.success(t("signupSuccess"));
      nav({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("invalidCreds"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-5 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> {t("login")}
          </Link>
          <LangToggle />
        </div>

        <GovIdentity className="mb-5" />
        <h1 className="mb-4 text-2xl font-bold">{t("signup")}</h1>

        <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("fullName")} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Gender" required>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("mobile")} required>
              <Input inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </Field>
            <Field label={t("password")} required>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </Field>
            <Field label={t("district")} required>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger><SelectValue placeholder={t("district")} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {TN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("school")} required>
              <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder={t("enterSchoolName")} />
            </Field>
            <Field label={t("class")} required>
              <Input
                value={klass}
                onChange={(e) => handleClassChange(e.target.value)}
                placeholder="LKG / UKG / 1-12"
                aria-invalid={classError ? "true" : "false"}
              />
              {classError && <p className="mt-1 text-xs font-medium text-destructive">{classError}</p>}
            </Field>
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? t("loading") : t("register")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("alreadyAccount")} <Link to="/login" className="font-semibold text-primary">{t("login")}</Link>
            </p>
          </form>
        </Card>
      </main>
      <GovFooter />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </Label>
      {children}
    </div>
  );
}
