import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { GovIdentity } from "@/components/gov-brand";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const { user, profile } = useAuth();
  const { t, lang } = useLang();
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0].key);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [myFeedback, setMyFeedback] = useState<any[]>([]);

  useEffect(() => {
    apiRequest<ApiListResponse<any>>("/api/feedback/my")
      .then((response) => setMyFeedback(response.data ?? []))
      .catch(() => setMyFeedback([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !profile) return;
    if (!profile.class || !profile.district) {
      toast.error(t("profileClassDistrictRequired"));
      return;
    }

    setLoading(true);
    const selectedCategory = FEEDBACK_CATEGORIES.find((item) => item.key === category);
    const categoryLabel = selectedCategory ? (lang === "ta" ? selectedCategory.ta : selectedCategory.en) : category;

    try {
      const response = await apiRequest<any>("/api/feedback", {
        method: "POST",
        body: {
          category,
          subject: categoryLabel,
          message: message.trim(),
        },
      });

      setLoading(false);
      toast.success(t("feedbackSubmitted"));

      const responseData = response?.data || response;
      if (responseData) {
        setMyFeedback((items) => [responseData, ...items]);
      }

      setMessage("");
    } catch (error) {
      setLoading(false);
      console.error("Feedback error:", error);
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN");
  };

  const trackingId = (item: any) => item.feedback_ref ?? item.feedback_id ?? item.id;
  const feedbackSubject = (item: any) => item.subject ?? item.category ?? "General";

  return (
    <div>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <Link to="/profile" className="inline-flex items-center text-xs opacity-80">
          <ArrowLeft className="mr-1 h-3 w-3" />
          {t("profile")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">{t("feedback")}</h1>
      </header>

      <div className="p-5">
        <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t("category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {lang === "ta" ? c.ta : c.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("yourMessage")}</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
            </div>
            <Button type="submit" className="h-12 w-full font-semibold" disabled={loading || !message.trim()}>
              {loading ? t("loading") : t("submit")}
            </Button>
          </form>
        </Card>
        <section className="mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-normal">MY FEEDBACK HISTORY</h2>
          </div>
          {myFeedback.length === 0 && (
            <Card className="border-0 p-4 text-center text-sm text-muted-foreground shadow-sm">{t("noData")}</Card>
          )}
          {myFeedback.map((item) => (
            <Card key={item.id} className="border-0 p-4 text-xs shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">{trackingId(item)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
                <span className="shrink-0 rounded bg-secondary px-2 py-1 text-[10px] font-semibold capitalize text-secondary-foreground">
                  {item.status ?? "new"}
                </span>
              </div>
              <div className="mt-3 grid gap-1">
                <p className="font-semibold">{feedbackSubject(item)}</p>
                <p className="text-muted-foreground">{item.message}</p>
              </div>
              <div className="mt-3 rounded-md bg-muted p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Latest Admin Reply</p>
                <p className="mt-1 text-foreground">{item.admin_response?.trim() || "-"}</p>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Last updated: {formatDate(item.updated_at ?? item.created_at)}</p>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
