import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lightbulb, MessageSquareWarning, MessageSquareText, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

export function SideNav() {
  const { t } = useLang();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/essentials", label: t("studentEssentials"), icon: Lightbulb },
    { to: "/complaints", label: t("complaints"), icon: MessageSquareWarning },
    { to: "/feedback", label: t("feedback"), icon: MessageSquareText },
  ];

  useEffect(() => {
    const openSideNav = () => setOpen(true);
    window.addEventListener("kalvi:open-side-nav", openSideNav);
    return () => window.removeEventListener("kalvi:open-side-nav", openSideNav);
  }, []);

  useEffect(() => {
    if (!loc.pathname.startsWith("/home")) setOpen(false);
  }, [loc.pathname]);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted",
    );

  const navLinks = (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = loc.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={linkClass(active)}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-50 bg-black/35 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card p-4 shadow-xl transition-transform duration-300 md:z-30 md:translate-x-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mt-5 md:mt-0">{navLinks}</div>
      </aside>
    </>
  );
}
