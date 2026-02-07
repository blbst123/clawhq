"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  DollarSign, 
  Clock, 
  ListTodo,
  Settings,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Costs", href: "/costs", icon: DollarSign },
  { name: "Cron Jobs", href: "/cron", icon: Clock },
  { name: "Chat", href: "/chat", icon: MessageSquare },
];

const bottomNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r border-white/5 bg-gradient-to-b from-[#1a1625] to-[#13111a] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <div className="relative">
            <span className="text-2xl">🦞</span>
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-purple-400 animate-pulse" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-gradient">ClawHQ</span>
          )}
        </div>
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button 
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-4 p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {!collapsed && (
          <p className="px-3 mb-2 text-xs font-medium text-white/30 uppercase tracking-wider">Menu</p>
        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "sidebar-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "active text-white bg-white/5"
                  : "text-white/50 hover:text-white"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-purple-400")} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-white/5 px-2 py-4 space-y-1">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "sidebar-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "active text-white bg-white/5"
                  : "text-white/50 hover:text-white"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-purple-400")} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </div>

      {/* Agent Status */}
      <div className="border-t border-white/5 p-4">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
              L
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#13111a] glow-green" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Lolo</p>
              <p className="text-xs text-green-400">Online</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
