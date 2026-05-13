"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  FileText,
  Send,
  Inbox,
  BarChart3,
  ShieldBan,
  Settings,
  UserCog,
  Smartphone,
  Bot,
  LogOut,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const channelsNav = [
  { href: "/whatsapp", label: "WhatsApp", icon: Smartphone, color: "text-emerald-500" },
  { href: "/telegram", label: "Telegram", icon: Bot, color: "text-blue-500" },
];

const adminNav = [
  { href: "/blacklist", label: "Blacklist", icon: ShieldBan },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "Users", icon: UserCog, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const renderItem = (item: { href: string; label: string; icon: React.ElementType; color?: string }) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          isActive
            ? "bg-foreground/[0.04] text-foreground"
            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
        )}
      >
        <item.icon className={cn("h-4 w-4 transition-colors", isActive ? item.color || "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-[hsl(var(--sidebar-bg))] flex-shrink-0">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">OneByOne</h1>
          <p className="text-[10px] text-muted-foreground -mt-0.5">CRM Sender</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-0.5">
          {mainNav.map(renderItem)}
        </div>

        <div>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
          <div className="space-y-0.5">
            {channelsNav.map(renderItem)}
          </div>
        </div>

        <div>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
          <div className="space-y-0.5">
            {adminNav.map((item) => {
              if (item.adminOnly && user?.role !== "ADMIN") return null;
              return renderItem(item);
            })}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="border-t p-3 space-y-1">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground h-9 px-3 text-sm font-normal"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
