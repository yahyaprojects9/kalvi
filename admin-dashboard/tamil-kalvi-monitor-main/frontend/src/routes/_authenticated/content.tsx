import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/content")({ component: ContentPage });

function ContentPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", class: "5", subject: "", material_type: "book", file_url: "" });
  async function load() { setMaterials(await adminApi<any[]>("/api/admin/materials")); setVideos(await adminApi<any[]>("/api/admin/videos")); }
  useEffect(() => { load(); }, []);
  async function addMaterial(e: React.FormEvent) { e.preventDefault(); await adminApi("/api/admin/materials", { method: "POST", body: JSON.stringify({ ...form, type: form.material_type, is_active: true }) }); setForm({ ...form, title: "", subject: "", file_url: "" }); load(); }
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Content Management</h1><p className="text-sm text-muted-foreground">Videos, Books and Guides</p></div>
      <Card className="p-4">
        <form onSubmit={addMaterial} className="grid md:grid-cols-5 gap-2">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Class" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} required />
          <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="book">Book</SelectItem><SelectItem value="guide">Guide</SelectItem></SelectContent></Select>
          <Input className="md:col-span-4" placeholder="PDF URL" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} required />
          <Button>Add</Button>
        </form>
      </Card>
      <Card className="p-4"><h2 className="font-semibold mb-3">Books / Guides</h2><div className="space-y-2">{materials.map((m) => <div key={m.id} className="text-sm border-b py-2">{m.material_type} | Class {m.class} | {m.subject} | {m.title}</div>)}</div></Card>
      <Card className="p-4"><h2 className="font-semibold mb-3">Videos</h2><div className="space-y-2">{videos.map((v) => <div key={v.id} className="text-sm border-b py-2">Class {v.class} | {v.subject} | {v.title}</div>)}</div></Card>
    </div>
  );
}
