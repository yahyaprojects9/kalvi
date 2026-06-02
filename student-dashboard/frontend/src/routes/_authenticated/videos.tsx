import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isStudent } from "@/lib/content-filters";
import { GovIdentity } from "@/components/gov-brand";
import { ResponsiveYouTube } from "@/components/responsive-youtube";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/videos")({
  component: VideosPage,
});

type VideoItem = {
  id: string;
  title: string;
  title_ta?: string;
  description?: string;
  class?: string;
  subject?: string;
  term?: string | null;
  url?: string;
  video_url?: string;
  youtube_video_id?: string;
  thumbnail_url?: string;
  created_at?: string;
};

function VideosPage() {
  const { profile, role } = useAuth();
  const { t, lang } = useLang();
  const student = isStudent(role);
  const [klass, setKlass] = useState<string>(profile?.class ?? "5");
  const [subject, setSubject] = useState<string>("all");
  const [term, setTerm] = useState<string>("all");
  const [allItems, setAllItems] = useState<VideoItem[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (profile?.class && student) setKlass(profile.class);
  }, [profile?.class, student]);

  useEffect(() => {
    const classToLoad = student && profile?.class ? profile.class : klass;

    setLoading(true);
    setError("");
    setActiveVideoId("");

    apiRequest<ApiListResponse<VideoItem>>(`/api/videos?class=${encodeURIComponent(classToLoad)}`)
      .then((response) => {
        setAllItems(response.data ?? []);
      })
      .catch((requestError) => {
        setAllItems([]);
        setError(requestError instanceof Error ? requestError.message : "Unable to load videos");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [klass, profile?.class, student]);

  useEffect(() => {
    setSubject("all");
    setTerm("all");
    setActiveVideoId("");
  }, [klass]);

  const classToShow = student && profile?.class ? profile.class : klass;
  const showTermFilter = classToShow === "5";
  const subjects = Array.from(new Set(allItems.map((i) => i.subject).filter(Boolean))).sort();
  const terms = Array.from(new Set(allItems.map((i) => i.term).filter(Boolean))).sort();
  const items = allItems.filter((item) => {
    const matchesSubject = subject === "all" || item.subject === subject;
    const matchesTerm = !showTermFilter || term === "all" || item.term === term;
    return matchesSubject && matchesTerm;
  });

  return (
    <div>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <h1 className="text-2xl font-bold text-primary">{t("videos")}</h1>
        <p className="text-xs opacity-70">{t("kalviTvLessonVideos")}</p>
      </header>

      <div className="space-y-3 px-5 py-4">
        {!student && (
          <Tabs value={klass} onValueChange={setKlass}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="5">{t("class")} 5</TabsTrigger>
              <TabsTrigger value="10">{t("class")} 10</TabsTrigger>
              <TabsTrigger value="12">{t("class")} 12</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger><SelectValue placeholder={t("selectSubject")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allSubjects")}</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {showTermFilter && (
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {terms.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          {loading && <p className="py-8 text-center text-sm text-muted-foreground sm:col-span-2">Loading videos...</p>}
          {!loading && error && <p className="py-8 text-center text-sm text-destructive sm:col-span-2">{error}</p>}
          {!loading && !error && items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground sm:col-span-2">{t("noData")}</p>}
          {items.map((v) => {
            const title = lang === "ta" && v.title_ta ? v.title_ta : v.title;
            const videoUrl = v.video_url ?? v.url ?? "";
            const isActive = activeVideoId === v.id;

            return (
              <Card key={v.id} className="w-full border-0 p-0 shadow-sm">
                {isActive ? (
                  <ResponsiveYouTube url={videoUrl} title={title} />
                ) : (
                  <button
                    type="button"
                    className="relative block aspect-video w-full overflow-hidden rounded-t-md bg-muted text-left"
                    onClick={() => setActiveVideoId(v.id)}
                    aria-label={`Play ${title}`}
                  >
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {title}
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-sm font-bold text-primary shadow-sm">
                        Play
                      </span>
                    </span>
                  </button>
                )}
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold">{title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{v.subject}{v.term ? ` - ${v.term}` : ""}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
