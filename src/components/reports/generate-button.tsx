"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { generateReport } from "@/lib/actions/reports";

interface Props {
  tenantId: string;
  existingReportId?: string; // if set, this is a regeneration
  currentVersion?: number;
}

export function GenerateButton({ tenantId, existingReportId, currentVersion = 0 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRegen = !!existingReportId;
  const maxVersionReached = currentVersion >= 3;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateReport(tenantId);
      if (result.success) {
        router.push(`/reports/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (maxVersionReached) {
    return (
      <p className="text-xs text-[#f87171]">Límite de 3 versiones alcanzado para este período.</p>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <RefreshCw size={15} className="animate-spin" />
            Generando…
          </>
        ) : isRegen ? (
          <>
            <RefreshCw size={15} />
            Regenerar informe
          </>
        ) : (
          <>
            <Sparkles size={15} />
            Generar informe
          </>
        )}
      </button>
      {isPending && (
        <p className="text-xs text-[#64748b]">Esto puede tardar unos segundos…</p>
      )}
      {error && <p className="text-xs text-[#f87171]">{error}</p>}
    </div>
  );
}
