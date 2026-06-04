import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { getLocalItems, SEED_NOTIFICATIONS } from "@/lib/mock-data";
import { notificationVisibleToProfile } from "@/lib/content-filters";
import { GovIdentity } from "@/components/gov-brand";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { profile, role } = useAuth();
  const { t, lang } = useLang();
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const unreadCount = items.filter((item) => !item.is_read).length;

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

  async function openNotification(item: any) {
    setSelected(item);
    if (item.is_read) return;

    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, is_read: true } : row)));
    try {
      const response = await apiRequest<any>(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      const updated = response?.data ?? response;
      if (updated?.id) {
        setItems((current) => current.map((row) => (row.id === item.id ? { ...row, ...updated, is_read: true } : row)));
      }
    } catch {
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, is_read: false } : row)));
    }
  }

  return (
    <div>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary">{t("notifications")}</h1>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{unreadCount} unread</span>
        </div>
      </header>

      <div className="space-y-3 p-5">
        {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>}
        {items.map((n) => (
          <Card
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => openNotification(n)}
            onKeyDown={(event) => event.key === "Enter" && openNotification(n)}
            className={`flex cursor-pointer gap-3 border-0 p-3 shadow-sm ${n.is_read ? "opacity-75" : "ring-1 ring-primary/25"}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{n.title}</p>
                {!n.is_read && <span className="shrink-0 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">New</span>}
              </div>
              <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{n.message}</p>
              {n.feedback_ref && <p className="mt-1 text-[10px] font-semibold text-primary">{n.feedback_ref}</p>}
              <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                {new Date(n.created_at).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")} - {n.target_type}{n.target_value ? ` - ${n.target_value}` : ""}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {selected.feedback_ref && <p className="font-semibold text-primary">{selected.feedback_ref}</p>}
              <p className="whitespace-pre-line text-muted-foreground">{selected.message}</p>
              <p className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
