"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  Clock,
  ListTodo,
  Settings,
  Calendar,
  Zap,
  PanelLeftClose,
  PanelLeft,
  FileText,
  Wrench,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGateway } from "@/lib/gateway-context";
import { useAgentIdentity } from "@/lib/use-agent-identity";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Activity", href: "/activity", icon: Zap },
  { name: "Planning", href: "/planning", icon: ListTodo },
  { name: "Cron Jobs", href: "/cron", icon: Clock },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Costs", href: "/costs", icon: DollarSign },
  { name: "Files", href: "/memory", icon: FileText },
  { name: "Skills", href: "/skills", icon: Wrench },
  { name: "Access", href: "/access", icon: Key },
];

function isNavActive(pathname: string, href: string) {
  // Normalize trailing slashes
  const p = pathname.replace(/\/+$/, "") || "/";
  const h = href.replace(/\/+$/, "") || "/";
  if (h === "/") return p === "/";
  return p === h || p.startsWith(h + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const { status: gwStatus } = useGateway();
  const { name: agentName, emoji: agentEmoji } = useAgentIdentity();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem("clawhq-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("clawhq-sidebar-collapsed", String(next));
  };

  return (
    <div className={cn(
      "flex h-full flex-col border-r border-white/[0.06] bg-[#161210] transition-all duration-200",
      collapsed ? "w-[52px]" : "w-[220px]"
    )}>
      {/* Logo + Collapse */}
      <div className="flex h-14 items-center justify-between px-3">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <span className="text-lg">{agentEmoji}</span>
          {!collapsed && (
            <span className="text-[15px] font-semibold text-white/90 tracking-tight">ClawHQ</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={toggle}
            className="text-white/25 hover:text-white/60 transition-colors p-1 rounded"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 pb-2 pt-0.5">
          <button
            onClick={toggle}
            className="w-full flex items-center justify-center rounded-md py-1.5 text-white/15 hover:text-white/50 hover:bg-white/[0.04] transition-colors border border-dashed border-white/[0.08] hover:border-white/[0.15]"
            title="Expand sidebar"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 space-y-0.5">
        {navigation.map((item) => {
          const isActive = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center rounded-md transition-colors",
                collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-[7px]",
                "text-[14px] font-medium",
                isActive
                  ? "text-white/90 bg-white/[0.08]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-white/70" : "text-white/30")} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-2 space-y-0.5">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center rounded-md transition-colors",
            collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-[7px]",
            "text-[14px] font-medium",
            isNavActive(pathname, "/settings")
              ? "text-white/90 bg-white/[0.08]"
              : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
          )}
        >
          <Settings className={cn("h-[18px] w-[18px] shrink-0", isNavActive(pathname, "/settings") ? "text-white/70" : "text-white/30")} />
          {!collapsed && "Settings"}
        </Link>
      </div>

      {/* Agent */}
      {!collapsed ? (
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500/80 to-amber-600/80 flex items-center justify-center text-white text-[11px] font-semibold">
                {agentName.charAt(0).toUpperCase()}
              </div>
              <div className={cn(
                "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[2px] border-[#161210]",
                gwStatus === "connected" ? "bg-green-500" :
                gwStatus === "connecting" ? "bg-orange-400 animate-pulse" :
                "bg-white/15"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/70 truncate leading-tight">{agentName}</p>
              <p className={cn("text-[11px] leading-tight",
                gwStatus === "connected" ? "text-green-400/60" :
                gwStatus === "connecting" ? "text-orange-400/60" :
                "text-white/20"
              )}>
                {gwStatus === "connected" ? "Online" :
                 gwStatus === "connecting" ? "Connecting…" :
                 "Offline"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/[0.06] flex justify-center py-3">
          <div className="relative">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500/80 to-amber-600/80 flex items-center justify-center text-white text-[11px] font-semibold">
              {agentName.charAt(0).toUpperCase()}
            </div>
            <div className={cn(
              "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[2px] border-[#161210]",
              gwStatus === "connected" ? "bg-green-500" :
              gwStatus === "connecting" ? "bg-orange-400 animate-pulse" :
              "bg-white/15"
            )} />
          </div>
        </div>
      )}
    </div>
  );
}
