import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { getLocalItems, SEED_NOTIFICATIONS } from "@/lib/mock-data";
import { notificationVisibleToProfile } from "@/lib/content-filters";
import { GovIdentity } from "@/components/gov-brand";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { profile, role } = useAuth();
  const { t, lang } = useLang();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const suffix = profile?.class ? `?target_class=${encodeURIComponent(profile.class)}` : "";
    apiRequest<ApiListResponse<any>>(`/api/notifications${suffix}`).then(({ data }) => {
      const fallback = getLocalItems("notifications", SEED_NOTIFICATIONS);
      setItems((data?.length ? data : fallback).filter((item) => notificationVisibleToProfile(item, profile, role)));
    }).catch(() => {
      const fallback = getLocalItems("notifications", SEED_NOTIFICATIONS);
      setItems(fallback.filter((item) => notificationVisibleToProfile(item, profile, role)));
    });
  }, [profile, role]);

  return (
    <div>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <h1 className="text-2xl font-bold text-primary">{t("notifications")}</h1>
      </header>

      <div className="space-y-3 p-5">
        {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>}
        {items.map((n) => (
          <Card key={n.id} className="flex gap-3 border-0 p-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                {new Date(n.created_at).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")} · {n.target_type}{n.target_value ? ` · ${n.target_value}` : ""}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
