import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, setAdminAuth, type AdminAuth } from "@/lib/admin-api";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Admin Login - Kalvi LMS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@kalvi.test");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = await adminApi<AdminAuth>("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setAdminAuth(auth);
      toast.success("Signed in");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="h-2 bg-accent" />
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-3">
          <img src="/logo.svg" alt="Government of Tamil Nadu Seal" className="h-12 w-12 object-contain bg-white rounded-full p-0.5 shadow-sm" />
          <div className="text-sm leading-tight">
            <div className="font-bold tracking-wide">Government of Tamil Nadu</div>
            <div className="opacity-90 text-xs">School Education Department</div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Tamil Nadu Government Logo" className="mx-auto h-16 w-16 object-contain bg-white rounded-full p-1 shadow-md border" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Kalvi LMS Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Authorised personnel only</p>
          </div>
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email/Admin ID</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                    required
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
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Please wait..." : "Sign In"}</Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
