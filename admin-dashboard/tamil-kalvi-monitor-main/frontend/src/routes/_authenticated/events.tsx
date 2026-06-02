import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/events")({
  component: EventsPage,
});

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const EVENT_CATEGORIES = [
  { value: "academics", label: "Academic" },
  { value: "non-academics", label: "Non Academic" },
  { value: "sports", label: "Sports" },
  { value: "general", label: "General" },
];

function expandClassRange(fromClass: string, toClass: string) {
  if (!fromClass || !toClass) return "";
  const from = Number(fromClass);
  const to = Number(toClass);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "";
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index)).join(",");
}

function eventClassLabel(event: any) {
  if (!event.target_class) return "All Classes";
  const classes = String(event.target_class).split(",").map((value) => value.trim()).filter(Boolean);
  if (classes.length === 0) return "All Classes";
  if (classes.length === 1) return `Class ${classes[0]}`;
  return `Class ${classes[0]} to ${classes[classes.length - 1]}`;
}

function EventsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    venue: "",
    fromClass: "",
    toClass: "",
    category: "general",
  });
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  async function load() {
    setItems(await adminApi<any[]>("/api/admin/events"));
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  function reset() {
    setForm({ title: "", description: "", event_date: "", event_time: "", venue: "", fromClass: "", toClass: "", category: "general" });
    setEditing(null);
  }

  function startEdit(ev: any) {
    const classes = String(ev.target_class ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    setEditing(ev);
    setForm({
      title: ev.title, description: ev.description ?? "",
      event_date: ev.event_date, event_time: ev.event_time ?? "",
      venue: ev.venue ?? "",
      fromClass: classes[0] ?? "",
      toClass: classes[classes.length - 1] ?? "",
      category: ev.category ?? "general",
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const targetClass = expandClassRange(form.fromClass, form.toClass);
    const payload: any = {
      title: form.title,
      description: form.description,
      event_date: form.event_date,
      event_time: form.event_time || null,
      location: form.venue,
      venue: form.venue,
      target_class: targetClass || null,
      audience: targetClass ? "class" : "all",
      category: form.category,
      is_active: true,
    };
    if (editing) await adminApi(`/api/admin/events/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await adminApi("/api/admin/events", { method: "POST", body: JSON.stringify(payload) });
    toast.success(editing ? "Event updated" : "Event added");
    setOpen(false); reset(); load();
  }

  async function remove(id: string) {
    await adminApi(`/api/admin/events/${id}`, { method: "DELETE" });
    toast.success("Deleted"); load();
  }

  // Calendar grid
  const calendar = useMemo(() => {
    const first = new Date(month);
    const startDay = first.getDay();
    const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const eventsByDay: Record<string, any[]> = {};
    items.forEach(ev => {
      const d = new Date(ev.event_date);
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        const key = String(d.getDate());
        (eventsByDay[key] ??= []).push(ev);
      }
    });
    const cells: { day: number | null; events: any[] }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({ day: null, events: [] });
    for (let d = 1; d <= daysIn; d++) cells.push({ day: d, events: eventsByDay[String(d)] ?? [] });
    return cells;
  }, [items, month]);

  const monthLabel = month.toLocaleString(undefined, { month: "long", year: "numeric" });
  const today = new Date();
  const isToday = (d: number | null) => d && today.getDate() === d && today.getMonth() === month.getMonth() && today.getFullYear() === month.getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Event Management</h1>
          <p className="text-sm text-muted-foreground">Events, exams and holidays</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <Input placeholder="Event title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                <Input type="time" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
              </div>
              <Input placeholder="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={form.fromClass || "all"} onValueChange={(value) => setForm({ ...form, fromClass: value === "all" ? "" : value, toClass: value === "all" ? "" : (form.toClass || value) })}>
                  <SelectTrigger><SelectValue placeholder="From Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.toClass || "all"} onValueChange={(value) => setForm({ ...form, toClass: value === "all" ? "" : value, fromClass: value === "all" ? "" : (form.fromClass || value) })}>
                  <SelectTrigger><SelectValue placeholder="To Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea rows={3} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Button type="submit" className="w-full">{editing ? "Update" : "Add"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{monthLabel}</h2>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
            <Button size="icon" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center font-semibold text-muted-foreground py-1">{d}</div>
          ))}
          {calendar.map((c, i) => (
            <div key={i} className={`min-h-[70px] border rounded p-1 ${c.day ? "" : "bg-secondary/30"} ${isToday(c.day) ? "border-primary border-2" : ""}`}>
              {c.day && (
                <>
                  <div className={`text-xs font-medium ${isToday(c.day) ? "text-primary" : ""}`}>{c.day}</div>
                  {c.events.slice(0, 2).map(ev => (
                    <div key={ev.id} className="mt-0.5 text-[10px] px-1 py-0.5 rounded bg-accent/30 truncate" title={ev.title}>{ev.title}</div>
                  ))}
                  {c.events.length > 2 && <div className="text-[10px] text-muted-foreground">+{c.events.length - 2} more</div>}
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Venue</th>
                <th className="text-left p-3 font-medium">Class</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No events</td></tr>}
              {items.map(ev => (
                <tr key={ev.id} className="border-t">
                  <td className="p-3 font-medium">{ev.title}</td>
                  <td className="p-3">{ev.event_date}</td>
                  <td className="p-3">{ev.event_time ?? "—"}</td>
                  <td className="p-3">{ev.venue ?? "—"}</td>
                  <td className="p-3">{eventClassLabel(ev)}</td>
                  <td className="p-3">{EVENT_CATEGORIES.find((category) => category.value === ev.category)?.label ?? ev.category ?? "General"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(ev)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(ev.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
