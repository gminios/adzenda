"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, TrendingUp, Megaphone,
  FileText, Bell, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Resumen",    href: "/",             icon: LayoutDashboard },
  { label: "Campañas",   href: "/campaigns",    icon: Megaphone },
  { label: "Tendencias", href: "/trends",       icon: TrendingUp },
  { label: "Informes",   href: "/reports",      icon: FileText },
  { label: "Alertas",    href: "/alerts",       icon: Bell,       disabled: true },
];

const settingsItems = [
  { label: "Clientes",  href: "/settings/tenants" },
  { label: "Umbrales",  href: "/settings/thresholds" },
  { label: "Entrega",   href: "/settings/delivery" },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-full w-60 flex-col border-r border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-6 py-5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500" />
        <span className="text-lg font-bold text-[#f1f5f9]">AdZenda</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#64748b]"
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                isActive(item.href)
                  ? "bg-white/10 font-medium text-[#f1f5f9]"
                  : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-[#f1f5f9]"
              )}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <p className="mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#64748b]">
          Configuración
        </p>
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              isActive(item.href)
                ? "bg-white/10 font-medium text-[#f1f5f9]"
                : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-[#f1f5f9]"
            )}
          >
            <Settings size={16} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-[#64748b]">Admin</p>
      </div>
    </aside>
  );
}
