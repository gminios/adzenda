"use client";

import { useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { markReportReady } from "@/lib/actions/reports";

export function MarkReadyButton({ reportId }: { reportId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await markReportReady(reportId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-sm text-[#34d399] transition hover:bg-emerald-500/30 disabled:opacity-60"
    >
      <CheckCircle size={14} />
      {isPending ? "Procesando…" : "Marcar como listo"}
    </button>
  );
}
