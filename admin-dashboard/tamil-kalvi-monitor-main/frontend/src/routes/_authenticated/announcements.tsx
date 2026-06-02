import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() { setItems(await adminApi<any[]>("/api/admin/notifications")); }
  useEffect(() => { load(); const t = window.setInterval(load, 30000); return () => window.clearInterval(t); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await adminApi("/api/admin/notifications", { method: "POST", body: JSON.stringify({ title, message, target_type: "all", is_active: true }) });
      toast.success("Announcement published"); setTitle(""); setMessage(""); load();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    await adminApi(`/api/admin/notifications/${id}`, { method: "DELETE" });
    toast.success("Deleted"); load();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Announcements</h1><p className="text-sm text-muted-foreground">Broadcast notices to all students</p></div>
      <Card className="p-4">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea className="md:col-span-2" rows={3} placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} required />
          <Button type="submit" disabled={busy} className="md:col-span-2"><Megaphone className="h-4 w-4 mr-2" /> Publish Announcement</Button>
        </form>
      </Card>
      <div className="space-y-3">
        {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">No announcements yet</Card>}
        {items.map((a) => (
          <Card key={a.id} className="p-4 flex items-start justify-between gap-2">
            <div><h3 className="font-semibold">{a.title}</h3><p className="mt-1.5 text-sm">{a.message}</p><div className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</div></div>
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
