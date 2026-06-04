import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/content")({ component: ContentPage });

function ContentPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", class: "5", subject: "", material_type: "book", file_url: "" });
  const [videoForm, setVideoForm] = useState({ title: "", class: "5", subject: "", url: "" });
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  async function load() { setMaterials(await adminApi<any[]>("/api/admin/materials")); setVideos(await adminApi<any[]>("/api/admin/videos")); }
  useEffect(() => { load(); }, []);

  function resetMaterialForm() {
    setForm({ title: "", class: "5", subject: "", material_type: "book", file_url: "" });
    setEditingMaterial(null);
  }

  function resetVideoForm() {
    setVideoForm({ title: "", class: "5", subject: "", url: "" });
    setEditingVideo(null);
  }

  function startMaterialEdit(material: any) {
    setEditingMaterial(material);
    setForm({
      title: material.title ?? "",
      class: material.class ?? "5",
      subject: material.subject ?? "",
      material_type: material.material_type ?? material.type ?? "book",
      file_url: material.file_url ?? material.url ?? "",
    });
  }

  function startVideoEdit(video: any) {
    setEditingVideo(video);
    setVideoForm({
      title: video.title ?? "",
      class: video.class ?? "5",
      subject: video.subject ?? "",
      url: video.url ?? video.video_url ?? "",
    });
  }

  async function saveMaterial(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, type: form.material_type, url: form.file_url, is_active: true };
    if (editingMaterial) {
      await adminApi(`/api/admin/materials/${editingMaterial.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      toast.success("Content updated");
    } else {
      await adminApi("/api/admin/materials", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Content added");
    }
    resetMaterialForm();
    load();
  }

  async function saveVideo(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...videoForm, video_url: videoForm.url, is_active: true };
    if (editingVideo) {
      await adminApi(`/api/admin/videos/${editingVideo.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      toast.success("Video updated");
    } else {
      await adminApi("/api/admin/videos", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Video added");
    }
    resetVideoForm();
    load();
  }

  async function deleteMaterial(id: string) {
    await adminApi(`/api/admin/materials/${id}`, { method: "DELETE" });
    toast.success("Content moved to recycle", {
      action: {
        label: "Undo",
        onClick: async () => {
          await adminApi(`/api/admin/materials/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
          toast.success("Content restored");
          load();
        },
      },
    });
    load();
  }

  async function deleteVideo(id: string) {
    await adminApi(`/api/admin/videos/${id}`, { method: "DELETE" });
    toast.success("Video moved to recycle", {
      action: {
        label: "Undo",
        onClick: async () => {
          await adminApi(`/api/admin/videos/${id}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
          toast.success("Video restored");
          load();
        },
      },
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Content Management</h1><p className="text-sm text-muted-foreground">Videos, Books and Guides</p></div>
      <Card className="p-4">
        <form onSubmit={saveMaterial} className="grid md:grid-cols-5 gap-2">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input placeholder="Class" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} required />
          <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="book">Book</SelectItem><SelectItem value="guide">Guide</SelectItem></SelectContent></Select>
          <Input className="md:col-span-4" placeholder="PDF URL" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} required />
          <Button>{editingMaterial ? "Update" : "Add"}</Button>
          {editingMaterial && <Button type="button" variant="outline" onClick={resetMaterialForm}><X className="mr-1 h-4 w-4" />Cancel</Button>}
        </form>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Videos</h2>
        <form onSubmit={saveVideo} className="mb-4 grid md:grid-cols-5 gap-2">
          <Input placeholder="Title" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} required />
          <Input placeholder="Class" value={videoForm.class} onChange={(e) => setVideoForm({ ...videoForm, class: e.target.value })} required />
          <Input placeholder="Subject" value={videoForm.subject} onChange={(e) => setVideoForm({ ...videoForm, subject: e.target.value })} required />
          <Input className="md:col-span-2" placeholder="Video URL" value={videoForm.url} onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })} required />
          <Button>{editingVideo ? "Update Video" : "Add Video"}</Button>
          {editingVideo && <Button type="button" variant="outline" onClick={resetVideoForm}><X className="mr-1 h-4 w-4" />Cancel</Button>}
        </form>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Books / Guides</h2>
        <div className="space-y-2">
          {materials.map((m) => (
            <div key={m.id} className="flex flex-col gap-2 border-b py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>{m.material_type} | Class {m.class} | {m.subject} | {m.title}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startMaterialEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMaterial(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Videos</h2>
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v.id} className="flex flex-col gap-2 border-b py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>Class {v.class} | {v.subject} | {v.title}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startVideoEdit(v)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteVideo(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
