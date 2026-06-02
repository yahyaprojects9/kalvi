import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/feedback")({ component: FeedbackPage });
const STATUSES = ["new", "reviewed", "resolved"];

function FeedbackPage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [open, setOpen] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [editStatus, setEditStatus] = useState("new");

  async function load() { setItems(await adminApi<any[]>("/api/admin/feedback")); }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((i) =>
    (status === "All" || i.status === status) &&
    (!q || i.student_name?.toLowerCase().includes(q.toLowerCase()) || i.message?.toLowerCase().includes(q.toLowerCase()))
  ), [items, q, status]);

  function openItem(i: any) { setOpen(i); setReply(i.admin_response ?? ""); setEditStatus(i.status ?? "new"); }
  async function save() {
    await adminApi(`/api/admin/feedback/${open.id}`, { method: "PATCH", body: JSON.stringify({ admin_response: reply, status: editStatus }) });
    toast.success("Feedback updated"); setOpen(null); load();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Feedback Management</h1><p className="text-sm text-muted-foreground">Review and respond to student submissions</p></div>
      <Card className="p-3 flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="All">All Statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2">No feedback found</Card>}
        {filtered.map((f) => (
          <Card key={f.id} className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => openItem(f)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="font-medium truncate">{f.student_name ?? "Student"}</div><div className="text-xs text-muted-foreground">{f.mobile_number ?? ""}</div></div>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-secondary">{f.status}</span>
            </div>
            <p className="mt-2 text-sm line-clamp-2">{f.message}</p>
            <div className="text-[10px] text-muted-foreground mt-2">{new Date(f.created_at).toLocaleString()}</div>
          </Card>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Feedback Details</DialogTitle></DialogHeader>
          {open && <div className="space-y-3">
            <div className="text-sm"><b>{open.student_name ?? "Student"}</b></div>
            <Card className="p-3 bg-secondary"><p className="text-sm">{open.message}</p></Card>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Write response..." />
            <Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Button onClick={save} className="w-full">Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
