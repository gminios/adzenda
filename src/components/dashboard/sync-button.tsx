"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { triggerAccountSync } from "@/lib/actions/ingestion";
import { useRouter } from "next/navigation";

export function SyncButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setErrorMsg(null);
    const result = await triggerAccountSync(accountId);
    if (result.success) {
      setState("idle");
      router.refresh();
    } else {
      setState("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9] disabled:opacity-40"
        title="Sincronizar ahora"
      >
        <RefreshCw size={14} className={state === "loading" ? "animate-spin" : ""} />
      </button>
      {state === "error" && errorMsg && (
        <p className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-red-500/20 bg-[#1a1333] p-2 text-xs text-[#f87171]">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
