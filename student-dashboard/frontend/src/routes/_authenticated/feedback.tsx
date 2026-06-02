import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { GovIdentity } from "@/components/gov-brand";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";
import { apiRequest, type ApiListResponse } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const { user, profile } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
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
      const response = await apiRequest<{ data: any }>("/api/feedback", {
        method: "POST",
        body: {
          message: `[${categoryLabel}] ${message.trim()}`,
        },
      });
      setLoading(false);
      toast.success(t("feedbackSubmitted"));
      setMyFeedback((items) => [response.data, ...items]);
      setMessage("");
      nav({ to: "/home" });
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    }
  };

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
        {myFeedback.length > 0 && (
          <div className="mt-4 space-y-2">
            {myFeedback.slice(0, 5).map((item) => (
              <Card key={item.id} className="border-0 p-3 text-xs shadow-sm">
                <p className="font-semibold">{item.status ?? "new"}</p>
                <p className="mt-1 text-muted-foreground">{item.message}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
