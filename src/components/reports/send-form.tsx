"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendReportManually } from "@/lib/actions/delivery";

interface Props {
  reportId: string;
  defaultRecipients: string[];
}

export function SendForm({ reportId, defaultRecipients }: Props) {
  const [recipientsText, setRecipientsText] = useState(defaultRecipients.join(", "));
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleSend() {
    const recipients = recipientsText
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (!recipients.length) {
      setResult({ ok: false, msg: "Ingresá al menos un email válido." });
      return;
    }

    setResult(null);
    startTransition(async () => {
      const res = await sendReportManually(reportId, recipients);
      setResult(res.success ? { ok: true, msg: "Informe enviado correctamente." } : { ok: false, msg: res.error });
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#94a3b8]">
          Destinatarios (separados por coma)
        </label>
        <textarea
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          rows={3}
          placeholder="cliente@empresa.com, otro@empresa.com"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[#f1f5f9] outline-none placeholder:text-[#64748b] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        <Send size={14} />
        {isPending ? "Enviando…" : "Enviar por email"}
      </button>

      {result && (
        <p className={`text-xs ${result.ok ? "text-[#34d399]" : "text-[#f87171]"}`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}
