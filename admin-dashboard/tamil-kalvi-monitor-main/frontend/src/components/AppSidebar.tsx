import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, MessageSquare, Megaphone, CalendarDays, BarChart3, AlertCircle, BookOpen, Recycle,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Complaints", url: "/complaints", icon: AlertCircle },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Content", url: "/content", icon: BookOpen },
  { title: "Recycle", url: "/recycle", icon: Recycle },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const closeMobileMenu = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-11 items-center gap-2 px-1.5 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shrink-0 p-0.5 shadow-sm border border-gray-100">
            <img src="/logo.svg" alt="TN Govt Seal" className="h-7 w-7 object-contain" />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">TN Monitoring</div>
              <div className="text-[10px] text-sidebar-foreground/70 truncate">Samacheer Kalvi</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
