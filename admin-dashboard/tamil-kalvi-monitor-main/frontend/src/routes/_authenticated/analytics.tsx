import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

type Stats = {
  students_by_class: Record<string, number>;
  students_by_gender: Record<string, number>;
  students_by_district: Record<string, number>;
  complaints_by_category: Record<string, number>;
  complaints_by_type: Record<string, number>;
  complaint_trends: Record<string, number>;
  events_by_class: Record<string, number>;
  active_students_today: number;
  total_students: number;
  total_complaints: number;
  resolved_complaints: number;
};

const COLORS = ["#1d4ed8", "#d97706", "#15803d", "#be123c", "#7c3aed", "#0f766e"];

function rows(data?: Record<string, number>) {
  return Object.entries(data ?? {}).map(([name, value]) => ({ name: name || "Unknown", value })).sort((a, b) => b.value - a.value);
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="h-72">{children}</div>
    </Card>
  );
}

function DataTable({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4 font-semibold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr><th className="p-3 text-left">Group</th><th className="p-3 text-right">Count</th></tr></thead>
          <tbody>
            {data.map((row) => <tr key={row.name} className="border-t"><td className="p-3">{row.name}</td><td className="p-3 text-right font-medium">{row.value}</td></tr>)}
            {data.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">No data available</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<Stats>("/api/admin/stats").then(setStats).catch((err) => setError(err.message));
  }, []);

  const classRows = useMemo(() => rows(stats?.students_by_class), [stats]);
  const genderRows = useMemo(() => rows(stats?.students_by_gender), [stats]);
  const districtRows = useMemo(() => rows(stats?.students_by_district).slice(0, 10), [stats]);
  const complaintRows = useMemo(() => rows({ ...(stats?.complaints_by_category ?? {}), ...(stats?.complaints_by_type ?? {}) }), [stats]);
  const trendRows = useMemo(() => rows(stats?.complaint_trends).sort((a, b) => a.name.localeCompare(b.name)), [stats]);
  const eventRows = useMemo(() => rows(stats?.events_by_class), [stats]);
  const resolutionRate = stats?.total_complaints ? Math.round(((stats.resolved_complaints ?? 0) / stats.total_complaints) * 100) : 0;

  if (error) return <Card className="p-6 text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Historical trends, distributions and decision support</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Daily Active Users</p><p className="mt-2 text-3xl font-semibold">{stats?.active_students_today ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Weekly Active Users</p><p className="mt-2 text-3xl font-semibold">{stats?.active_students_today ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Monthly Active Users</p><p className="mt-2 text-3xl font-semibold">{stats?.total_students ?? 0}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Class-wise Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#1d4ed8" /></BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Gender Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={genderRows} dataKey="value" nameKey="name" outerRadius={95} label>{genderRows.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Complaint Trends">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#be123c" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card className="p-4">
          <h2 className="font-semibold">Resolution Rates</h2>
          <div className="mt-6">
            <p className="text-5xl font-semibold">{resolutionRate}%</p>
            <p className="mt-2 text-sm text-muted-foreground">{stats?.resolved_complaints ?? 0} of {stats?.total_complaints ?? 0} complaints resolved or closed</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-success" style={{ width: `${resolutionRate}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DataTable title="District Distribution" data={districtRows} />
        <DataTable title="Complaint Categories" data={complaintRows} />
        <DataTable title="Events by Class" data={eventRows} />
      </div>
    </div>
  );
}
