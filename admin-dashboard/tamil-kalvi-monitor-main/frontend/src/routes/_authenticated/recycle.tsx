import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/recycle")({ component: RecyclePage });

const TYPE_LABELS: Record<string, string> = {
  notifications: "Announcement",
  events: "Event",
  materials: "Content",
  videos: "Video",
};

function itemTitle(item: any) {
  return item.title ?? item.subject ?? item.message ?? "Deleted item";
}

function itemDescription(item: any) {
  if (item.recycle_type === "events") return item.event_date ? `Event date: ${item.event_date}` : "Event";
  if (item.recycle_type === "materials") return `${item.material_type ?? item.type ?? "Material"} | Class ${item.class ?? "All"}`;
  if (item.recycle_type === "videos") return `Class ${item.class ?? "All"} | ${item.subject ?? "Video"}`;
  return item.message ?? "Announcement";
}

function RecyclePage() {
  const [items, setItems] = useState<any[]>([]);
  const [busyId, setBusyId] = useState("");

  async function load() {
    setItems(await adminApi<any[]>("/api/admin/recycle"));
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const type = item.recycle_type ?? "other";
      (acc[type] ??= []).push(item);
      return acc;
    }, {});
  }, [items]);

  async function restore(item: any) {
    setBusyId(item.id);
    try {
      await adminApi(`/api/admin/recycle/${item.recycle_type}/${item.id}`, { method: "PATCH" });
      toast.success(`${TYPE_LABELS[item.recycle_type] ?? "Item"} restored`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function removeForever(item: any) {
    setBusyId(item.id);
    try {
      await adminApi(`/api/admin/recycle/${item.recycle_type}/${item.id}`, { method: "DELETE" });
      toast.success(`${TYPE_LABELS[item.recycle_type] ?? "Item"} permanently deleted`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Recycle</h1>
        <p className="text-sm text-muted-foreground">Restore deleted announcements, events and content</p>
      </div>

      {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">Recycle is empty</Card>}

      {Object.entries(grouped).map(([type, rows]) => (
        <Card key={type} className="p-4">
          <h2 className="mb-3 font-semibold">{TYPE_LABELS[type] ?? type}</h2>
          <div className="space-y-2">
            {rows.map((item) => (
              <div key={`${type}-${item.id}`} className="flex flex-col gap-3 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{itemTitle(item)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{itemDescription(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deleted: {new Date(item.updated_at ?? item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => restore(item)}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Restore
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => removeForever(item)}>
                    <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
