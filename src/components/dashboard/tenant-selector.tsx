"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setActiveTenantId } from "@/lib/active-tenant";

interface Tenant {
  id: string;
  name: string;
}

interface Props {
  tenants: Tenant[];
  activeTenantId: string | null;
}

export function TenantSelector({ tenants, activeTenantId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active = tenants.find((t) => t.id === activeTenantId) ?? tenants[0];

  function handleSelect(tenantId: string) {
    setOpen(false);
    startTransition(async () => {
      await setActiveTenantId(tenantId);
      router.refresh();
    });
  }

  if (tenants.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm transition",
          "hover:bg-white/[0.10] focus:outline-none",
          isPending && "opacity-70"
        )}
      >
        <Building2 size={14} className="text-indigo-400" />
        <span className="max-w-[140px] truncate font-medium text-[#f1f5f9]">
          {active?.name ?? "Seleccionar cliente"}
        </span>
        <ChevronDown size={14} className={cn("text-[#94a3b8] transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#1a1333]/95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelect(tenant.id)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-[#f1f5f9] transition hover:bg-white/[0.08]"
            >
              <span className="truncate">{tenant.name}</span>
              {tenant.id === active?.id && (
                <Check size={14} className="shrink-0 text-indigo-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
