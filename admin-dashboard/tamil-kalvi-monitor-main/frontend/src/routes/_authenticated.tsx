import { useEffect, useState } from "react";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { adminApi, clearAdminAuth, getAdminAuth } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window !== "undefined" && !getAdminAuth()) throw redirect({ to: "/login" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(getAdminAuth()?.admin.email ?? "");

  useEffect(() => {
    adminApi<any>("/api/admin/me").then((admin) => setEmail(admin.email)).catch(() => {
      clearAdminAuth();
      navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  function logout() {
    clearAdminAuth();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-14 border-b bg-card flex items-center px-3 sm:px-4 gap-2 sm:gap-3 sticky top-0 z-10">
            <SidebarTrigger className="shrink-0" />
            <img src="/logo.svg" alt="TN Govt Seal" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 object-contain bg-white rounded-full p-0.5 shadow-sm border" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate text-foreground">Kalvi LMS Admin Dashboard</div>
              <div className="text-xs text-muted-foreground truncate hidden sm:block font-medium">Backend API connected</div>
            </div>
            <div className="hidden md:block text-xs text-muted-foreground truncate max-w-[180px]">{email}</div>
            <Button variant="ghost" size="sm" onClick={logout} className="shrink-0">
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
