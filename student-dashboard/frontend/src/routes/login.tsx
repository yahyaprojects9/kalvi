import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/lib/lang-context";
import { useAuth, isValidMobile, type Profile } from "@/lib/auth-context";
import { toast } from "sonner";
import { LangToggle } from "@/components/lang-toggle";
import { GovFooter, GovIdentity } from "@/components/gov-brand";
import { apiRequest } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useLang();
  const { setStudentAuth } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState("");
  const [studentPw, setStudentPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !studentPw) return;

    if (!isValidMobile(mobile)) {
      toast.error(t("enterValidMobileNumber"));
      return;
    }

    if (studentPw.length < 6) {
      toast.error(t("invalidCreds"));
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest<{ data: { token: string; student: Profile } }>("/api/auth/login", {
        method: "POST",
        body: {
          mobile_number: mobile,
          password: studentPw,
        },
      });
      setStudentAuth(response.data.token, response.data.student);
      nav({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("invalidCreds"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <GovIdentity className="mb-3" />
        <div className="mb-6 flex justify-end">
          <LangToggle />
        </div>

        <div className="mb-6 rounded-md border border-primary/20 bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-primary">{t("tagline")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("appIntro")}</p>
        </div>

        <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
          <h1 className="mb-4 text-xl font-bold">{t("studentLogin")}</h1>
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div>
              <Label htmlFor="mobile">{t("mobileLogin")}</Label>
              <Input id="mobile" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="spw">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="spw"
                  type={showPassword ? "text" : "password"}
                  value={studentPw}
                  onChange={(e) => setStudentPw(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? t("loading") : t("login")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("noAccount")} <Link to="/signup" className="font-semibold text-primary">{t("signup")}</Link>
            </p>
          </form>
        </Card>

        <Card className="mt-5 border border-dashed border-border bg-muted/40 p-4 shadow-none">
          <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{t("prototypeTestingCredentials")}</p>
          <div className="grid gap-2 text-xs">
            <p><b>Kavi:</b> 9000010001 / student123</p>
            <p><b>Arun:</b> 9000010002 / student123</p>
            <p><b>Arul:</b> 9000010003 / student123</p>
          </div>
        </Card>
      </main>

      <GovFooter />
    </div>
  );
}
