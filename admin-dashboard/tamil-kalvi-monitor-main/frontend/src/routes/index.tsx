import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminAuth } from "@/lib/admin-api";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window !== "undefined" && getAdminAuth()) throw redirect({ to: "/dashboard" });
    throw redirect({ to: "/login" });
  },
});
