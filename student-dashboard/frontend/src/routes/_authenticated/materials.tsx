import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ExternalLink, X } from "lucide-react";
import { isStudent } from "@/lib/content-filters";
import { GovIdentity } from "@/components/gov-brand";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/materials")({
  component: MaterialsPage,
});

type Material = {
  id: string;
  title: string;
  title_ta?: string;
  class?: string;
  subject?: string;
  chapter?: string;
  term?: string | null;
  type?: string;
  material_type?: string;
  source?: string;
  url?: string;
  file_url?: string;
  storage_path?: string;
  drive_file_id?: string | null;
};

function extractDriveFileId(url?: string | null) {
  if (!url) return "";
  return url.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.match(/[?&]id=([^&]+)/)?.[1] ?? "";
}

function materialPreviewUrl(item: Material) {
  const fileId = item.drive_file_id ?? extractDriveFileId(item.file_url ?? item.url);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return materialFallbackUrl(item);
}

function materialFallbackUrl(item: Material) {
  return item.file_url ?? item.url ?? "";
}

function materialFastOpenUrl(item: Material) {
  const fileId = item.drive_file_id ?? extractDriveFileId(item.file_url ?? item.url);
  if (fileId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  return materialFallbackUrl(item);
}

function materialViewerUrl(item: Material) {
  return materialPreviewUrl(item);
}

function MaterialsPage() {
  const { profile, role } = useAuth();
  const { t, lang } = useLang();
  const student = isStudent(role);
  const [category, setCategory] = useState<"books" | "guides">("books");
  const [klass, setKlass] = useState(profile?.class ?? "5");
  const [items, setItems] = useState<Material[]>([]);
  const [subject, setSubject] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfTimedOut, setPdfTimedOut] = useState<boolean>(false);

  useEffect(() => {
    if (profile?.class && student) setKlass(profile.class);
  }, [profile?.class, student]);

  useEffect(() => {
    const load = async () => {
      const classToLoad = student && profile?.class ? profile.class : klass;
      setLoading(true);
      setError("");
      setActiveMaterial(null);
      try {
        const [bookResponse, guideResponse] = await Promise.all([
          apiRequest<ApiListResponse<Material>>(`/api/materials?class=${encodeURIComponent(classToLoad)}&type=book`),
          apiRequest<ApiListResponse<Material>>(`/api/materials?class=${encodeURIComponent(classToLoad)}&type=guide`),
        ]);
        setItems([...(bookResponse.data ?? []), ...(guideResponse.data ?? [])]);
      } catch (requestError) {
        setItems([]);
        setError(requestError instanceof Error ? requestError.message : "Unable to load materials");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [klass, profile?.class, student]);

  useEffect(() => {
    setSubject("all");
    setActiveMaterial(null);
  }, [klass, category]);

  const classToShow = student && profile?.class ? profile.class : klass;

  useEffect(() => {
    if (!activeMaterial) {
      setPdfLoading(false);
      setPdfTimedOut(false);
      return;
    }
    setPdfLoading(true);
    setPdfTimedOut(false);
    const timer = window.setTimeout(() => setPdfTimedOut(true), 12000);
    return () => window.clearTimeout(timer);
  }, [activeMaterial?.id, activeMaterial?.file_url, activeMaterial?.url]);

  const categoryItems = useMemo(() => {
    const targetType = category === "books" ? "book" : "guide";
    return items.filter((item) => (item.material_type ?? item.type) === targetType && (!item.class || item.class === classToShow));
  }, [items, category, classToShow]);

  const filtered = useMemo(() => {
    return categoryItems.filter((item) => subject === "all" || item.subject === subject);
  }, [categoryItems, subject]);

  const subjects = useMemo(() => {
    return Array.from(new Set(categoryItems.map((item) => item.subject).filter((value): value is string => Boolean(value)))).sort();
  }, [categoryItems]);

  const emptyMessage = category === "books" ? "No books available for your class yet" : "No guides available for your class yet";

  const openMaterial = (item: Material) => {
    setActiveMaterial(null);
    setPdfLoading(true);
    setPdfTimedOut(false);
    window.setTimeout(() => setActiveMaterial(item), 0);
  };

  const grouped = useMemo(() => {
    return subjects.map((currentSubject) => ({
      subject: currentSubject,
      rows: filtered.filter((item) => item.subject === currentSubject),
    })).filter((group) => group.rows.length > 0);
  }, [filtered, subjects]);

  return (
    <div className={activeMaterial ? "overflow-x-hidden pb-20" : "overflow-x-hidden"}>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <h1 className="text-2xl font-bold text-primary">{t("materials")}</h1>
        <p className="text-xs opacity-70">
          {student ? `${t("class")} ${profile?.class}` : t("organizedByClassSubjectChapter")}
        </p>
      </header>

      <div className="space-y-4 p-5">
        <Tabs value={category} onValueChange={(value) => setCategory(value as "books" | "guides")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="books"><BookOpen className="mr-1.5 h-4 w-4" />Books</TabsTrigger>
            <TabsTrigger value="guides"><FileText className="mr-1.5 h-4 w-4" />Guides</TabsTrigger>
          </TabsList>
        </Tabs>

        {!student && (
          <Select value={klass} onValueChange={setKlass}>
            <SelectTrigger><SelectValue placeholder={t("selectClass")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{t("class")} 5</SelectItem>
              <SelectItem value="10">{t("class")} 10</SelectItem>
              <SelectItem value="12">{t("class")} 12</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger><SelectValue placeholder={t("selectSubject")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allSubjects")}</SelectItem>
            {subjects.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeMaterial && (
          <Card className="overflow-hidden border-0 p-3 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{lang === "ta" && activeMaterial.title_ta ? activeMaterial.title_ta : activeMaterial.title}</p>
                <p className="text-[11px] text-muted-foreground">{activeMaterial.subject}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button asChild size="sm" variant="ghost">
                  <a href={materialFastOpenUrl(activeMaterial)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />Open PDF in new tab
                  </a>
                </Button>
                <Button size="icon" variant="ghost" aria-label="Close PDF viewer" onClick={() => setActiveMaterial(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative min-h-[420px] overflow-hidden rounded-md bg-muted md:min-h-[620px]">
              {pdfLoading && <p className="absolute inset-x-0 top-4 z-10 text-center text-xs text-muted-foreground">Loading PDF...</p>}
              {pdfTimedOut && (
                <div className="absolute inset-x-3 top-12 z-10 rounded-md bg-background/95 p-3 text-center shadow-sm">
                  <p className="mb-2 text-xs text-muted-foreground">PDF is taking longer than expected.</p>
                  <Button asChild size="sm" variant="outline">
                    <a href={materialFastOpenUrl(activeMaterial)} target="_blank" rel="noreferrer">Open PDF in new tab</a>
                  </Button>
                </div>
              )}
              <iframe
                key={`${activeMaterial.id}-${materialViewerUrl(activeMaterial)}`}
                title={activeMaterial.title}
                src={materialViewerUrl(activeMaterial)}
                className="h-[72vh] min-h-[420px] w-full max-w-full border-0 md:min-h-[620px]"
                loading="eager"
                onLoad={() => {
                  setPdfLoading(false);
                  setPdfTimedOut(false);
                }}
              />
            </div>
          </Card>
        )}

        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading materials...</p>}
        {!loading && error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>}

        <div className="space-y-4">
          {grouped.map((group) => (
            <section key={group.subject} className="space-y-2">
              <h2 className="text-sm font-bold text-primary">{group.subject}</h2>
              <div className="space-y-2">
                {group.rows.map((item) => {
                  const type = (item.material_type ?? item.type) === "book" ? "Book" : "Guide";
                  return (
                    <Card key={item.id} className="border-0 p-3 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                          {type === "Book" ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{lang === "ta" && item.title_ta ? item.title_ta : item.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.subject} | {t("class")} {item.class} | Type: {type}
                          </p>
                        </div>
                        <Button className="w-full sm:w-auto" size="sm" variant="ghost" onClick={() => openMaterial(item)}>
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          {t("openMaterial")}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
