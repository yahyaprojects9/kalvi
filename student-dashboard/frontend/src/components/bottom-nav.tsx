import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Calendar, Home, Play, User } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useLang();
  const loc = useLocation();

  const items = [
    { to: "/home", label: t("home"), icon: Home },
    { to: "/materials", label: t("materials"), icon: BookOpen },
    { to: "/videos", label: t("videos"), icon: Play },
    { to: "/events", label: t("events"), icon: Calendar },
    { to: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:left-64">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1 md:max-w-2xl">
        {items.map((item) => {
          const active = loc.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-12 items-center justify-center rounded-xl transition-all",
                  active && "bg-primary/15",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
