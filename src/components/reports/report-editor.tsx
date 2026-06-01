"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { updateReportNarrative } from "@/lib/actions/reports";

interface Props {
  reportId: string;
  initialNarrative: string;
}

export function ReportEditor({ reportId, initialNarrative }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialNarrative);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateReportNarrative(reportId, text);
      if (result.success) {
        router.push(`/reports/${reportId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={18}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-[#cbd5e1] outline-none placeholder:text-[#64748b] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-y"
        placeholder="Narrativa del informe…"
      />

      {error && <p className="text-xs text-[#f87171]">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Save size={15} />
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          onClick={() => router.push(`/reports/${reportId}`)}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#94a3b8] transition hover:bg-white/[0.06]"
        >
          <X size={15} />
          Cancelar
        </button>
      </div>
    </div>
  );
}
