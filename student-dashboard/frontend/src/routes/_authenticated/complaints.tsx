import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { GovIdentity } from "@/components/gov-brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/complaints")({
  component: ComplaintPage,
});

const complaintTypes = [
  { value: "ragging", label: "Ragging" },
  { value: "harassment", label: "Harassment" },
  { value: "staff_misbehavior", label: "Staff Misbehavior" },
  { value: "discrimination", label: "Discrimination" },
  { value: "infrastructure_issue", label: "Infrastructure Issue" },
  { value: "other", label: "Other" },
];

type ComplaintResponse = {
  success: boolean;
  data: {
    id: string;
    status: string;
  };
};

function ComplaintPage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const complaintTypeLabels = {
    ragging: t("ragging"),
    harassment: t("harassment"),
    staff_misbehavior: t("staffMisbehavior"),
    discrimination: t("discrimination"),
    infrastructure_issue: t("infrastructureIssue"),
    other: t("other"),
  };
  const [complaintType, setComplaintType] = useState(complaintTypes[0].value);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [schoolName, setSchoolName] = useState(profile?.school_name ?? "");
  const [loading, setLoading] = useState(false);
  const [complaintId, setComplaintId] = useState("");

  const district = profile?.district ?? "";
  const studentClass = profile?.class ?? "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim() || !district || !schoolName.trim() || !studentClass) {
      toast.error(t("completeRequiredFields"));
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest<ComplaintResponse>("/api/complaints", {
        method: "POST",
        body: {
          student_id: profile?.id,
          mobile_number: profile?.mobile_number,
          complaint_type: complaintType,
          subject: subject.trim(),
          description: description.trim(),
          district,
          school_name: schoolName.trim(),
          class: studentClass,
        },
      });
      setComplaintId(result.data.id);
      setSubject("");
      setDescription("");
      toast.success(t("anonymousComplaintSubmitted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="rounded-b-3xl bg-secondary px-5 pb-6 pt-6 text-secondary-foreground">
        <GovIdentity compact className="mb-4" />
        <Link to="/home" className="inline-flex items-center text-xs opacity-80">
          <ArrowLeft className="mr-1 h-3 w-3" />
          {t("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">{t("anonymousComplaint")}</h1>
      </header>

      <main className="space-y-4 p-5">
        <Card className="border-0 p-4 shadow-[var(--shadow-card)]">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("anonymous")}</p>
              <p className="text-xs text-muted-foreground">{t("nameNeverShared")}</p>
            </div>
          </div>
        </Card>

        {complaintId && (
          <Card className="border-0 bg-primary/10 p-4 shadow-sm">
            <p className="text-sm font-semibold text-primary">{t("complaintSubmitted")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("saveComplaintId")}</p>
            <p className="mt-2 break-all rounded-md bg-card p-2 text-xs font-semibold">{complaintId}</p>
          </Card>
        )}

        <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
          <form onSubmit={submit} className="space-y-4">
            <Field label={t("complaintType")}>
              <Select value={complaintType} onValueChange={setComplaintType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {complaintTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {complaintTypeLabels[type.value as keyof typeof complaintTypeLabels] ?? type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("subject")}>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={255} />
            </Field>

            <Field label={t("description")}>
              <Textarea
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
              />
            </Field>

            <Field label={t("district")}>
              <Input value={district} readOnly className="bg-muted" />
            </Field>

            <Field label={t("school")}>
              <Input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} maxLength={255} />
            </Field>

            <Field label={t("class")}>
              <Input value={studentClass} readOnly className="bg-muted" />
            </Field>

            <Button type="submit" className="h-12 w-full font-semibold" disabled={loading}>
              {loading ? t("loading") : t("submitComplaint")}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
