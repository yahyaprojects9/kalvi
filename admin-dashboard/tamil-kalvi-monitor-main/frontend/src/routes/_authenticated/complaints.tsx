import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/complaints")({ component: ComplaintsPage });
const STATUSES = ["pending", "in_progress", "resolved", "closed"];

function ComplaintsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; admin_response: string }>>({});
  const [busyId, setBusyId] = useState("");
  async function load() { setItems(await adminApi<any[]>("/api/admin/complaints")); }
  useEffect(() => { load(); }, []);

  function draftFor(item: any) {
    return drafts[item.id] ?? { status: item.status ?? "pending", admin_response: item.admin_response ?? "" };
  }

  function setDraft(item: any, patch: Partial<{ status: string; admin_response: string }>) {
    setDrafts((current) => ({
      ...current,
      [item.id]: {
        status: current[item.id]?.status ?? item.status ?? "pending",
        admin_response: current[item.id]?.admin_response ?? item.admin_response ?? "",
        ...patch,
      },
    }));
  }

  async function update(item: any) {
    const draft = draftFor(item);
    setBusyId(item.id);
    try {
      await adminApi(`/api/admin/complaints/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: draft.status,
          admin_response: draft.admin_response.trim() || null,
        }),
      });
      toast.success("Complaint updated");
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Unable to update complaint");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Anonymous Complaints</h1><p className="text-sm text-muted-foreground">Complaint text, time and status without student identity</p></div>
      {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">No complaints</Card>}
      {items.map((p) => <Card key={p.id} className="p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-semibold">{p.subject}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <span className="text-xs uppercase">{p.status}</span>
        </div>
        <p className="text-sm leading-relaxed">{p.description}</p>
        <p className="text-xs text-muted-foreground">Type: {p.complaint_type ?? "General"}</p>
        <Select value={draftFor(p).status} onValueChange={(status) => setDraft(p, { status })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Textarea
          rows={3}
          value={draftFor(p).admin_response}
          onChange={(event) => setDraft(p, { admin_response: event.target.value })}
          placeholder="Optional reply message to student..."
        />
        <Button disabled={busyId === p.id} onClick={() => update(p)} className="w-full sm:w-auto">
          {busyId === p.id ? "Saving..." : "Save Status / Reply"}
        </Button>
      </Card>)}
    </div>
  );
}
