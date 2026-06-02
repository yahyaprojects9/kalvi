import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, CalendarDays, MessageSquare, Plus, UserCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value.toLocaleString()}</p>
    </Card>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<any>("/api/admin/stats").then(setStats).catch((err) => setError(err.message));
  }, []);

  const upcomingEvents = stats?.upcoming_events ?? [];
  const recentActivity = stats?.recent_activity ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operational summary for today</p>
      </div>

      {error && <Card className="p-4 text-destructive">{error}</Card>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Students" value={stats?.total_students ?? 0} icon={Users} />
        <MetricCard label="Active Students Today" value={stats?.active_students_today ?? 0} icon={UserCheck} />
        <MetricCard label="Total Complaints" value={stats?.total_complaints ?? 0} icon={MessageSquare} />
        <MetricCard label="Pending Complaints" value={stats?.pending_complaints ?? 0} icon={AlertCircle} />
        <MetricCard label="Upcoming Events" value={upcomingEvents.length} icon={CalendarDays} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Upcoming Events</h2>
            <Button asChild size="sm" variant="outline"><Link to="/events">Manage</Link></Button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No upcoming events</p>}
            {upcomingEvents.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.event_date} | {event.target_class ? `Classes ${event.target_class}` : "All classes"}</p>
                </div>
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Quick Actions</h2>
          <div className="grid gap-2">
            <Button asChild className="justify-start"><Link to="/events"><Plus className="mr-2 h-4 w-4" />Create Event</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/complaints"><AlertCircle className="mr-2 h-4 w-4" />Review Complaints</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/students"><Users className="mr-2 h-4 w-4" />Monitor Students</Link></Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Recent Activity Feed</h2>
        <div className="space-y-3">
          {recentActivity.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded today</p>}
          {recentActivity.map((item: any) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
              <p className="text-sm"><span className="font-medium">{item.user_name ?? "User"}</span> {item.event_type ?? "activity"}</p>
              <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
