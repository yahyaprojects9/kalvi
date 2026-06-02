import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/complaints")({ component: ComplaintsPage });
const STATUSES = ["pending", "in_progress", "resolved", "closed"];

function ComplaintsPage() {
  const [items, setItems] = useState<any[]>([]);
  async function load() { setItems(await adminApi<any[]>("/api/admin/complaints")); }
  useEffect(() => { load(); }, []);
  async function update(id: string, patch: any) { await adminApi(`/api/admin/complaints/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); load(); }
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
        <Select value={p.status ?? "pending"} onValueChange={(status) => update(p.id, { status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </Card>)}
    </div>
  );
}
