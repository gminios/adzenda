"use client";

import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { triggerAccountSync } from "@/lib/actions/ingestion";
import { useRouter } from "next/navigation";

type SyncState = "idle" | "loading" | "success" | "error";

export function SyncButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SyncState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setErrorMsg(null);
    const result = await triggerAccountSync(accountId);
    if (result.success) {
      setState("success");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    } else {
      setState("error");
      setErrorMsg(result.error);
    }
  }

  const title =
    state === "loading"
      ? "Sincronizando…"
      : state === "success"
        ? "Sincronizado"
        : "Sincronizar ahora";

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={state === "loading"}
        className={`rounded-lg p-1.5 transition hover:bg-white/[0.08] disabled:opacity-40 ${
          state === "success"
            ? "text-[#34d399]"
            : "text-[#94a3b8] hover:text-[#f1f5f9]"
        }`}
        title={title}
      >
        {state === "success" ? (
          <Check size={14} />
        ) : (
          <RefreshCw size={14} className={state === "loading" ? "animate-spin" : ""} />
        )}
      </button>
      {state === "error" && errorMsg && (
        <div
          role="alert"
          className="absolute right-0 top-8 z-10 w-56 rounded-lg border border-red-500/20 bg-[#1a1333] p-2 text-xs text-[#f87171] shadow-lg"
        >
          <p>{errorMsg}</p>
          <button
            onClick={() => {
              setState("idle");
              setErrorMsg(null);
            }}
            className="mt-1.5 text-[10px] text-[#94a3b8] underline underline-offset-2 hover:text-[#f1f5f9]"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
