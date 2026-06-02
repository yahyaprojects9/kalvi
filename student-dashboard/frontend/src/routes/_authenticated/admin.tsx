import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LangToggle } from "@/components/lang-toggle";
import { toast } from "sonner";
import {
  Activity,
  Users,
  Bell,
  MessageSquare,
  MessageSquareWarning,
  LogOut,
  Send,
  Radio,
  BarChart3,
  Upload,
  CalendarPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  addLocalItem,
  deleteLocalItem,
  getLocalItems,
  SEED_ACTIVITY,
  SEED_EVENTS,
  SEED_FEEDBACK,
  SEED_MATERIALS,
  SEED_NOTIFICATIONS,
  SEED_VIDEOS,
  updateLocalItem,
} from "@/lib/mock-data";
import { GovIdentity } from "@/components/gov-brand";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type AdminEvent = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  venue: string;
  target_class: string;
  district?: string;
  registration_url?: string;
  eligibility?: string;
};

type Complaint = {
  id: string;
  complaint_type: string;
  subject: string;
  description: string;
  district: string;
  school_name: string;
  class: string;
  status: string;
  created_at: string;
};

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
};

type ApiRowResponse<T> = {
  success: boolean;
  data: T;
};

const complaintTypeLabels: Record<string, string> = {
  ragging: "Ragging",
  harassment: "Harassment",
  staff_misbehavior: "Staff Misbehavior",
  discrimination: "Discrimination",
  infrastructure_issue: "Infrastructure Issue",
  other: "Other",
};

const emptyEvent = {
  title: "",
  description: "",
  event_date: "",
  event_time: "09:00",
  venue: "",
  target_class: "10",
};

function AdminPage() {
  const { profile, role, signOut } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const isAdmin = role === "district_admin" || role === "super_admin";
  const [activity, setActivity] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintFilters, setComplaintFilters] = useState({
    district: "",
    school_name: "",
    class: "",
    complaint_type: "all",
    status: "all",
  });
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [counts, setCounts] = useState({ students: 0, logins: 0, notifications: 0, online: 0 });
  const [pulse, setPulse] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetValue, setTargetValue] = useState("");

  const [resource, setResource] = useState({
    title: "",
    class: "10",
    subject: "",
    chapter: "",
    type: "textbook",
    url: "",
  });
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [infoText, setInfoText] = useState("");

  useEffect(() => {
    if (role && !isAdmin) nav({ to: "/home" });
  }, [isAdmin, nav, role]);

  const loadComplaints = useCallback(async (filters = complaintFilters) => {
    setComplaintsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const response = await apiRequest<ApiListResponse<Complaint>>(`/api/complaints${suffix}`);
      setComplaints(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    } finally {
      setComplaintsLoading(false);
    }
  }, [complaintFilters, t]);

  useEffect(() => {
    const loadAll = async () => {
      const [
        { data: act },
        { data: fb },
        { data: ev },
        { count: studentsCount },
        { count: notifCount },
      ] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("events").select("*").order("event_date", { ascending: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("notifications").select("*", { count: "exact", head: true }),
      ]);
      const fallbackActivity = getLocalItems("activity", SEED_ACTIVITY);
      const fallbackFeedback = getLocalItems("feedback", SEED_FEEDBACK);
      const fallbackEvents = getLocalItems("events", SEED_EVENTS) as AdminEvent[];
      const rows = act?.length ? act : fallbackActivity;
      setActivity(rows);
      setFeedback(fb?.length ? fb : fallbackFeedback);
      setEvents((ev?.length ? ev : fallbackEvents) as AdminEvent[]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const online = rows.filter(
        (row) => Date.now() - new Date(row.created_at).getTime() < 15 * 60 * 1000,
      ).length;
      setCounts({
        students: studentsCount ?? 3,
        logins: rows.filter(
          (row) => row.event_type === "login" && new Date(row.created_at) >= today,
        ).length,
        notifications: notifCount ?? getLocalItems("notifications", SEED_NOTIFICATIONS).length,
        online,
      });
      loadComplaints();
    };
    loadAll();

    const channel = supabase
      .channel("admin-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const row: any = payload.new;
          setActivity((prev) => [row, ...prev].slice(0, 50));
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
          setCounts((c) => ({
            ...c,
            logins: row.event_type === "login" ? c.logins + 1 : c.logins,
            online: c.online + 1,
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadComplaints]);

  const analytics = useMemo(() => {
    const materials = getLocalItems("materials", SEED_MATERIALS);
    const videos = getLocalItems("videos", SEED_VIDEOS);
    const notices = getLocalItems("notifications", SEED_NOTIFICATIONS);
    return [
      { label: "School-wise usage", value: new Set(activity.map((a) => a.school_name)).size || 3 },
      {
        label: "Class-wise usage",
        value: new Set(activity.map((a) => a.class).filter(Boolean)).size || 3,
      },
      { label: "Video watch analytics", value: videos.length },
      { label: "Material access analytics", value: materials.length },
      {
        label: "Notification read rates",
        value: `${Math.round((notices.filter((n) => n.read_status).length / Math.max(1, notices.length)) * 100)}%`,
      },
    ];
  }, [activity]);

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  const sendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    const row = {
      id: `notice-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      target_type: targetType,
      target_value: targetType === "all" ? null : targetValue || profile?.district || null,
      created_at: new Date().toISOString(),
      read_status: false,
    };
    const { id: _id, read_status: _readStatus, ...dbRow } = row;
    const { error } = await supabase.from("notifications").insert(dbRow);
    if (error) addLocalItem("notifications", row);
    toast.success(lang === "ta" ? "அறிவிப்பு அனுப்பப்பட்டது" : "Notice sent");
    setTitle("");
    setMessage("");
    setTargetValue("");
    setCounts((c) => ({ ...c, notifications: c.notifications + 1 }));
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource.title || !resource.subject || !resource.url) return;
    const row = {
      id: `material-${Date.now()}`,
      ...resource,
      language: "ta" as const,
      source: "Admin upload",
      created_at: new Date().toISOString(),
    };
    const table = resource.type === "video" ? "videos" : "materials";
    const payload =
      resource.type === "video"
        ? {
            id: row.id,
            title: row.title,
            class: row.class,
            subject: row.subject,
            chapter: row.chapter,
            url: row.url,
            source: row.source,
            created_at: row.created_at,
            duration_minutes: 0,
          }
        : row;
    const { id: _id, ...dbPayload } = payload;
    const { error } = await supabase.from(table).insert(dbPayload);
    if (error) addLocalItem(table, payload);
    toast.success(lang === "ta" ? "உள்ளடக்கம் சேர்க்கப்பட்டது" : "Content added");
    setResource({ title: "", class: "10", subject: "", chapter: "", type: "textbook", url: "" });
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.event_date) return;
    const row: AdminEvent = {
      id: editingEventId ?? `event-${Date.now()}`,
      ...eventForm,
      district: profile?.district ?? "Tamil Nadu",
      registration_url: "",
      eligibility: `Class ${eventForm.target_class}`,
    };
    const { eligibility: _eligibility, ...eventDbPayloadWithId } = row;
    const { id: _eventId, ...eventInsertPayload } = eventDbPayloadWithId;
    const request = editingEventId
      ? supabase.from("events").update(eventDbPayloadWithId).eq("id", editingEventId)
      : supabase.from("events").insert(eventInsertPayload);
    const { error } = await request;
    if (error) {
      if (editingEventId) updateLocalItem("events", editingEventId, row);
      else addLocalItem("events", row);
    }
    setEvents((prev) =>
      editingEventId
        ? prev.map((event) => (event.id === editingEventId ? row : event))
        : [row, ...prev],
    );
    toast.success(editingEventId ? "Event updated" : "Calendar event pushed");
    setEditingEventId(null);
    setEventForm(emptyEvent);
  };

  const editEvent = (event: AdminEvent) => {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description ?? "",
      event_date: event.event_date,
      event_time: event.event_time ?? "09:00",
      venue: event.venue ?? "",
      target_class: event.target_class ?? "10",
    });
  };

  const removeEvent = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) deleteLocalItem("events", id);
    setEvents((prev) => prev.filter((event) => event.id !== id));
    if (editingEventId === id) {
      setEditingEventId(null);
      setEventForm(emptyEvent);
    }
    toast.success("Event deleted");
  };

  const updateFeedback = async (id: string, patch: Record<string, string>) => {
    const { error } = await supabase.from("feedback").update(patch).eq("id", id);
    if (error) updateLocalItem("feedback", id, patch);
    setFeedback((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    toast.success(patch.status === "resolved" ? "Feedback marked resolved" : "Reply saved");
  };

  const updateComplaintStatus = async (id: string, status: string) => {
    try {
      const response = await apiRequest<ApiRowResponse<Complaint>>(`/api/complaints/${id}`, {
        method: "PATCH",
        body: { status },
      });
      setComplaints((prev) => prev.map((row) => (row.id === id ? response.data : row)));
      toast.success("Complaint status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    }
  };

  const addInfo = () => {
    if (!infoText.trim()) return;
    addLocalItem("info_bar", { id: `info-${Date.now()}`, message: infoText.trim() });
    setInfoText("");
    toast.success(lang === "ta" ? "தகவல் பட்டை புதுப்பிக்கப்பட்டது" : "Information bar updated");
  };

  if (role && !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary px-5 py-5 text-secondary-foreground shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <GovIdentity compact />
          <div className="flex items-center gap-2">
            <LangToggle className="text-secondary-foreground hover:bg-white/10" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-secondary-foreground hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-5">
        <div>
          <h1 className="text-xl font-bold text-primary">{t("dashboard")}</h1>
          <p className="text-xs text-muted-foreground">
            {role === "super_admin"
              ? "State Super Admin"
              : `${profile?.district ?? "District"} Admin`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label={t("totalStudents")}
            value={counts.students}
            icon={Users}
            tint="primary"
          />
          <StatCard
            label="Logins Today"
            value={counts.logins}
            icon={Activity}
            tint="accent"
            pulse={pulse}
          />
          <StatCard
            label={t("onlineUsers")}
            value={counts.online}
            icon={Radio}
            tint="primary"
            pulse={pulse}
          />
          <StatCard
            label={t("notifications")}
            value={counts.notifications}
            icon={Bell}
            tint="secondary"
          />
        </div>

        <Tabs defaultValue="feed">
          <TabsList className="grid h-auto w-full grid-cols-3 md:grid-cols-7">
            <TabsTrigger value="feed">
              <Radio className="mr-1.5 h-4 w-4" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="notice">
              <Send className="mr-1.5 h-4 w-4" />
              Notify
            </TabsTrigger>
            <TabsTrigger value="content">
              <Upload className="mr-1.5 h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="events">
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="complaints">
              <MessageSquareWarning className="mr-1.5 h-4 w-4" />
              Complaints
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed">
            <Card className="border-0 p-0 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2 border-b border-border p-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="text-xs font-medium">
                  Live student login feed and activity tracking
                </span>
              </div>
              <ActivityList rows={activity} />
            </Card>
          </TabsContent>

          <TabsContent value="notice">
            <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
              <form onSubmit={sendNotice} className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Target">
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">District-wide / All</SelectItem>
                      <SelectItem value="district">{t("district")}</SelectItem>
                      <SelectItem value="class">{t("class")}</SelectItem>
                      <SelectItem value="school">{t("school")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {targetType !== "all" && (
                  <Field label="Target value">
                    <Input
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder={
                        targetType === "class" ? "5, 10, or 12" : (profile?.district ?? "")
                      }
                    />
                  </Field>
                )}
                <Field label="Message">
                  <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
                <div className="md:col-span-2">
                  <Button type="submit">
                    <Send className="mr-2 h-4 w-4" />
                    {t("submit")}
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
              <form onSubmit={addResource} className="grid gap-4 md:grid-cols-3">
                <Field label="Title">
                  <Input
                    value={resource.title}
                    onChange={(e) => setResource({ ...resource, title: e.target.value })}
                  />
                </Field>
                <Field label={t("class")}>
                  <Select
                    value={resource.class}
                    onValueChange={(value) => setResource({ ...resource, class: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Type">
                  <Select
                    value={resource.type}
                    onValueChange={(value) => setResource({ ...resource, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="textbook">Book</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="book_back">Book back answers</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="video">Video link</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Subject">
                  <Input
                    value={resource.subject}
                    onChange={(e) => setResource({ ...resource, subject: e.target.value })}
                  />
                </Field>
                <Field label="Chapter">
                  <Input
                    value={resource.chapter}
                    onChange={(e) => setResource({ ...resource, chapter: e.target.value })}
                  />
                </Field>
                <Field label="URL">
                  <Input
                    value={resource.url}
                    onChange={(e) => setResource({ ...resource, url: e.target.value })}
                  />
                </Field>
                <div className="md:col-span-3">
                  <Button type="submit">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload / Add link
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-3 md:grid-cols-5">
              {analytics.map((item) => (
                <Card key={item.label} className="border-0 p-4 shadow-sm">
                  <p className="text-2xl font-bold text-primary">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <Card className="border-0 p-5 shadow-[var(--shadow-card)]">
                <form onSubmit={saveEvent} className="grid gap-4">
                  <Field label="Event / exam title">
                    <Input
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Date">
                      <Input
                        type="date"
                        value={eventForm.event_date}
                        onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      />
                    </Field>
                    <Field label="Time">
                      <Input
                        type="time"
                        value={eventForm.event_time}
                        onChange={(e) => setEventForm({ ...eventForm, event_time: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Venue">
                    <Input
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    />
                  </Field>
                  <Field label="Target class">
                    <Input
                      value={eventForm.target_class}
                      onChange={(e) => setEventForm({ ...eventForm, target_class: e.target.value })}
                      placeholder="5,10,12"
                    />
                  </Field>
                  <Field label="Description">
                    <Input
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit">
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      {editingEventId ? "Update event" : "Push calendar event"}
                    </Button>
                    {editingEventId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingEventId(null);
                          setEventForm(emptyEvent);
                        }}
                      >
                        Cancel edit
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              <Card className="border-0 p-0 shadow-[var(--shadow-card)]">
                <div className="border-b border-border p-3 text-sm font-semibold">
                  Manage events and exam schedules
                </div>
                <div className="max-h-[480px] divide-y divide-border overflow-auto">
                  {events.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">{t("noData")}</p>
                  )}
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-md bg-primary/15 text-primary">
                        <span className="text-[10px] font-semibold">
                          {new Date(event.event_date).toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(event.event_date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.venue || "Online"} · Class {event.target_class}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => editEvent(event)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback">
            <Card className="mb-3 border-0 p-4 shadow-sm">
              <div className="flex gap-2">
                <Input
                  value={infoText}
                  onChange={(e) => setInfoText(e.target.value)}
                  placeholder="Update homepage information bar"
                />
                <Button type="button" onClick={addInfo}>
                  Update
                </Button>
              </div>
            </Card>
            <Card className="border-0 p-0 shadow-[var(--shadow-card)]">
              <div className="divide-y divide-border">
                {feedback.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">{t("noData")}</p>
                )}
                {feedback.map((f) => (
                  <div key={f.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge>{f.category}</Badge>
                      <Badge variant="outline">{f.status}</Badge>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{f.message}</p>
                    {f.response && (
                      <p className="mt-2 rounded-md bg-muted p-2 text-xs">{f.response}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedback(f.id, { status: "resolved" })}
                      >
                        Mark resolved
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateFeedback(f.id, {
                            response: "Admin has reviewed and replied to this issue.",
                          })
                        }
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="complaints">
            <Card className="mb-3 border-0 p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-6">
                <Input
                  value={complaintFilters.district}
                  onChange={(e) => setComplaintFilters({ ...complaintFilters, district: e.target.value })}
                  placeholder="District"
                />
                <Input
                  value={complaintFilters.school_name}
                  onChange={(e) => setComplaintFilters({ ...complaintFilters, school_name: e.target.value })}
                  placeholder="School Name"
                />
                <Input
                  value={complaintFilters.class}
                  onChange={(e) => setComplaintFilters({ ...complaintFilters, class: e.target.value })}
                  placeholder="Class"
                />
                <Select
                  value={complaintFilters.complaint_type}
                  onValueChange={(value) => setComplaintFilters({ ...complaintFilters, complaint_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(complaintTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={complaintFilters.status}
                  onValueChange={(value) => setComplaintFilters({ ...complaintFilters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => loadComplaints()}>
                  Filter
                </Button>
              </div>
            </Card>

            <Card className="border-0 p-0 shadow-[var(--shadow-card)]">
              <div className="border-b border-border p-3">
                <p className="text-sm font-semibold">Anonymous complaints</p>
                <p className="text-xs text-muted-foreground">Reporter names and user IDs are not stored.</p>
              </div>
              <div className="divide-y divide-border">
                {complaintsLoading && (
                  <p className="p-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
                )}
                {!complaintsLoading && complaints.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">{t("noData")}</p>
                )}
                {!complaintsLoading &&
                  complaints.map((complaint) => (
                    <div key={complaint.id} className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{complaintTypeLabels[complaint.complaint_type] ?? complaint.complaint_type}</Badge>
                        <Badge variant="outline">{complaint.status}</Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{complaint.subject}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{complaint.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {complaint.district} · {complaint.school_name} · Class {complaint.class}
                      </p>
                      <div className="mt-3 max-w-xs">
                        <Select
                          value={complaint.status}
                          onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="reviewing">Reviewing</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ActivityList({ rows }: { rows: any[] }) {
  return (
    <div className="max-h-[60vh] divide-y divide-border overflow-auto">
      {rows.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground">No data available</p>
      )}
      {rows.map((a) => (
        <div key={a.id} className="flex items-start gap-3 p-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{a.user_name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">
              {a.school_name} · {a.district} {a.class ? `· Class ${a.class}` : ""}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="text-[10px]">
              {a.event_type}
            </Badge>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {new Date(a.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
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

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
  pulse,
}: {
  label: string;
  value: number;
  icon: any;
  tint: "primary" | "accent" | "secondary";
  pulse?: boolean;
}) {
  const styles = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    secondary: "bg-secondary/15 text-secondary",
  }[tint];
  return (
    <Card
      className={`border-0 p-4 shadow-[var(--shadow-card)] transition-all ${pulse ? "ring-2 ring-accent" : ""}`}
    >
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-md ${styles}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase leading-tight tracking-wide text-muted-foreground">
        {label}
      </p>
    </Card>
  );
}
