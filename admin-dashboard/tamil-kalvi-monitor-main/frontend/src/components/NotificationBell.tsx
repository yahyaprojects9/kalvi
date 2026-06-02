import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  return (
    <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
      <Bell className="h-5 w-5" />
    </Button>
  );
}
