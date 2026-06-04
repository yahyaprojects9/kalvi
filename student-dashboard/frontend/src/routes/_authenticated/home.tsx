import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { LangToggle } from "@/components/lang-toggle";
import { Card } from "@/components/ui/card";
import { Bell, BookOpen, School, MapPin, Menu, UserRound } from "lucide-react";
import { getLocalItems, SEED_EVENTS, SEED_MATERIALS, SEED_NOTIFICATIONS, SEED_VIDEOS } from "@/lib/mock-data";
import { classesMatch, eventVisibleToProfile, notificationVisibleToProfile } from "@/lib/content-filters";
import { resolveProfileName } from "@/lib/name-localization";
import { GovIdentity } from "@/components/gov-brand";
import { GeminiLauncher } from "@/components/gemini-launcher";
import { apiRequest, type ApiListResponse, type ApiRowResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const { profile, role } = useAuth();
  const { t, lang } = useLang();
  const displayName = resolveProfileName(profile, lang);
  const [stats, setStats] = useState({ materials: 0, videos: 0, notifications: 0, events: 0 });
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.class) return;
    (async () => {
      const fallbackMaterials = getLocalItems("materials", SEED_MATERIALS).filter((item) => classesMatch(item.class, profile.class));
      const fallbackVideos = getLocalItems("videos", SEED_VIDEOS).filter((item) => classesMatch(item.class, profile.class));
      const fallbackNotices = getLocalItems("notifications", SEED_NOTIFICATIONS).filter((item) => notificationVisibleToProfile(item, profile, role));
      const fallbackEvents = getLocalItems("events", SEED_EVENTS).filter((item) => eventVisibleToProfile(item, profile, role));

      try {
        const [materialsResponse, videosResponse, noticesResponse, eventsResponse] = await Promise.all([
          apiRequest<ApiListResponse<any>>(`/api/materials?class=${encodeURIComponent(profile.class)}`),
          apiRequest<ApiListResponse<any>>(`/api/videos?class=${encodeURIComponent(profile.class)}`),
          apiRequest<ApiRowResponse<{ unread: number }>>(`/api/notifications/unread-count?target_class=${encodeURIComponent(profile.class)}`),
          apiRequest<ApiListResponse<any>>("/api/events"),
        ]);

        const safeEvents = (eventsResponse.data ?? []).filter((item) => eventVisibleToProfile(item, profile, role));

        setStats({
          materials: materialsResponse.data.length || fallbackMaterials.length,
          videos: videosResponse.data.length || fallbackVideos.length,
          notifications: noticesResponse.data?.unread ?? fallbackNotices.length,
          events: safeEvents.length || fallbackEvents.length,
        });
        setRecentMaterials(materialsResponse.data.length ? materialsResponse.data.slice(0, 4) : fallbackMaterials.slice(0, 4));
      } catch {
        setStats({
          materials: fallbackMaterials.length,
          videos: fallbackVideos.length,
          notifications: fallbackNotices.length,
          events: fallbackEvents.length,
        });
        setRecentMaterials(fallbackMaterials.slice(0, 4));
      }
    })();
  }, [profile, role]);

  const openSideNav = () => {
    window.dispatchEvent(new Event("kalvi:open-side-nav"));
  };

  return (
    <div>
      <header className="relative rounded-b-3xl bg-secondary px-5 pb-8 pt-6 text-secondary-foreground shadow-lg">
        <GovIdentity compact className="mb-4" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-75">{t("greeting")}</p>
            <h1 className="mt-0.5 text-2xl font-bold leading-tight text-primary">{displayName}</h1>
            <p className="mt-1 text-xs opacity-70">
              {profile?.school_name} · {t("class")} {profile?.class}{profile?.section ? ` · ${profile.section}` : ""}
            </p>
            <p className="text-xs opacity-60">{profile?.district}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Link to="/notifications" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Bell className="h-5 w-5" />
            {stats.notifications > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-accent px-1.5 text-[9px] font-bold text-accent-foreground">{stats.notifications}</span>}
          </Link>
          <LangToggle className="text-secondary-foreground hover:bg-white/10" />
          <GeminiLauncher />
          <button
            type="button"
            aria-label="Open menu"
            onClick={openSideNav}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md backdrop-blur md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="space-y-5 px-5">
        <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">{t("studentDetails")}</h2>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" />{displayName}</p>
            <p className="flex items-center gap-2"><School className="h-3.5 w-3.5" />{profile?.school_name ?? "-"}</p>
            <p className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" />{t("class")} {profile?.class ?? "-"}{profile?.section ? ` · ${profile.section}` : ""}</p>
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{profile?.district ?? "-"}</p>
          </div>
        </Card>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold">{t("recentUploads")}</h2>
            <Link to="/materials" className="text-xs font-medium text-primary">{t("view")}</Link>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {recentMaterials.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="min-w-[170px] rounded-md border border-border bg-card p-3 shadow-sm">
                <div className="mb-2 flex h-16 items-center justify-center rounded-md bg-primary/15">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <p className="line-clamp-2 text-xs font-semibold">{lang === "ta" && m.title_ta ? m.title_ta : m.title}</p>
                <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{m.subject} · {m.type}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Upcoming events removed as requested */}
      </div>
    </div>
  );
}
