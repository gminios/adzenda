"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { upsertDeliveryConfig } from "@/lib/actions/delivery";

interface InitialConfig {
  emailEnabled: boolean;
  recipients:   string[];
  autoSend:     boolean;
}

interface Props {
  tenantId:      string;
  initialConfig: InitialConfig | null;
}

export function DeliveryConfigForm({ tenantId, initialConfig }: Props) {
  const [emailEnabled, setEmailEnabled] = useState(initialConfig?.emailEnabled ?? true);
  const [recipientsText, setRecipientsText] = useState(
    (initialConfig?.recipients ?? []).join(", ")
  );
  const [autoSend, setAutoSend] = useState(initialConfig?.autoSend ?? false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleSave() {
    const recipients = recipientsText
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    setResult(null);
    startTransition(async () => {
      const res = await upsertDeliveryConfig({ tenantId, emailEnabled, recipients, autoSend });
      setResult(res.success
        ? { ok: true, msg: "Configuración guardada." }
        : { ok: false, msg: res.error });
    });
  }

  return (
    <div className="space-y-5">
      {/* Email toggle */}
      <label className="flex cursor-pointer items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#f1f5f9]">Envío por email</p>
          <p className="text-xs text-[#64748b]">Habilitá el canal de email para este cliente</p>
        </div>
        <button
          type="button"
          onClick={() => setEmailEnabled((p) => !p)}
          className={`relative h-6 w-11 rounded-full transition-colors ${emailEnabled ? "bg-indigo-500" : "bg-white/10"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${emailEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </label>

      {/* Recipients */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#94a3b8]">
          Destinatarios (separados por coma)
        </label>
        <textarea
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          rows={3}
          placeholder="cliente@empresa.com, gerencia@empresa.com"
          disabled={!emailEnabled}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[#f1f5f9] outline-none placeholder:text-[#64748b] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none disabled:opacity-40"
        />
      </div>

      {/* Auto-send */}
      <label className="flex cursor-pointer items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#f1f5f9]">Envío automático semanal</p>
          <p className="text-xs text-[#64748b]">Enviar automáticamente cada lunes a las 08:00</p>
        </div>
        <button
          type="button"
          onClick={() => setAutoSend((p) => !p)}
          disabled={!emailEnabled}
          className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${autoSend ? "bg-indigo-500" : "bg-white/10"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoSend ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </label>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        <Save size={14} />
        {isPending ? "Guardando…" : "Guardar configuración"}
      </button>

      {result && (
        <p className={`text-xs ${result.ok ? "text-[#34d399]" : "text-[#f87171]"}`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}
