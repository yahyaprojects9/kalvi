import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/students")({ component: StudentsPage });

const ALL = "all";
const CLASSES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const GENDERS = ["Male", "Female", "Other"];

function StudentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filters, setFilters] = useState({ class: ALL, gender: ALL, district: ALL, school_name: ALL });
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => { adminApi<any[]>("/api/admin/students").then(setItems); }, []);

  const districtOptions = useMemo(() => Array.from(new Set(items.map((s) => s.district).filter(Boolean))).sort(), [items]);
  const schoolOptions = useMemo(() => Array.from(new Set(items.map((s) => s.school_name).filter(Boolean))).sort(), [items]);

  const rows = useMemo(() => items.filter((s) => {
    if (filters.class !== ALL && String(s.class) !== filters.class) return false;
    if (filters.gender !== ALL && String(s.gender ?? "").toLowerCase() !== filters.gender.toLowerCase()) return false;
    if (filters.district !== ALL && s.district !== filters.district) return false;
    if (filters.school_name !== ALL && s.school_name !== filters.school_name) return false;
    return true;
  }), [items, filters]);

  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => setFilters({ class: ALL, gender: ALL, district: ALL, school_name: ALL });

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Student Monitoring</h1><p className="text-sm text-muted-foreground">Read-only student list</p></div>
      <Card className="p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={filters.class} onValueChange={(value) => setFilter("class", value)}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Classes</SelectItem>
              {CLASSES.map((value) => <SelectItem key={value} value={value}>Class {value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.gender} onValueChange={(value) => setFilter("gender", value)}>
            <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Genders</SelectItem>
              {GENDERS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.district} onValueChange={(value) => setFilter("district", value)}>
            <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Districts</SelectItem>
              {districtOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.school_name} onValueChange={(value) => setFilter("school_name", value)}>
            <SelectTrigger><SelectValue placeholder="School" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Schools</SelectItem>
              {schoolOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={resetFilters}>Reset Filters</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{rows.length} of {items.length} students matched</p>
      </Card>
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-secondary"><tr>{["Name","Mobile","Gender","Class","School","District","Signup"].map((h) => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
        <tbody>{pageRows.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No students match the selected filters</td></tr> : pageRows.map((s) => <tr key={s.id} className="border-t"><td className="p-3 font-medium">{s.full_name}</td><td className="p-3">{s.mobile_number}</td><td className="p-3">{s.gender}</td><td className="p-3">{s.class}</td><td className="p-3">{s.school_name}</td><td className="p-3">{s.district}</td><td className="p-3">{new Date(s.created_at).toLocaleDateString()}</td></tr>)}</tbody>
      </table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(value + 1, totalPages))}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
