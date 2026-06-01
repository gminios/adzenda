"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type PeriodValue } from "@/lib/periods";

export function PeriodSelector({ value }: { value: PeriodValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function handleSelect(next: PeriodValue) {
    if (next === value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "7d") {
      params.delete("period");
    } else {
      params.set("period", next);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl",
        pending && "opacity-70"
      )}
      role="tablist"
      aria-label="Seleccionar período"
    >
      <span className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#64748b]">
        Últimos
      </span>
      {PERIOD_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={pending}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
              active
                ? "bg-indigo-500/20 text-indigo-200 shadow-[0_0_0_1px_rgba(99,102,241,0.4)_inset]"
                : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-[#f1f5f9]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
