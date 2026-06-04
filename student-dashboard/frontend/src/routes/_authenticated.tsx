import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Sparkles } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!session) {
    throw redirect({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-20 md:pl-64">
        <Outlet />
      </div>
      <SideNav />
      <BottomNav />
    </div>
  );
}
