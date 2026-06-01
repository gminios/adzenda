"use client";

import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { DEFAULT_THRESHOLDS, METRIC_LABELS, type MetricKey } from "@/lib/benchmarks";
import { upsertThreshold, resetThreshold } from "@/lib/actions/thresholds";
import { SemaphoreBadge } from "@/components/ui/semaphore-badge";

interface ThresholdRow {
  metric: MetricKey;
  lowerBound: number;
  upperBound: number;
  isCustom: boolean;
}

interface Props {
  tenantId: string;
  rows: ThresholdRow[];
}

const METRIC_ORDER: MetricKey[] = ["roas", "ctr", "cpc", "cpm", "frequency", "cpa"];

const METRIC_HINT: Record<MetricKey, string> = {
  roas:      "🟢 >arriba  🟡 entre límites  🔴 <abajo  (más es mejor)",
  ctr:       "🟢 >arriba  🟡 entre límites  🔴 <abajo  (más es mejor)",
  cpc:       "🟢 <abajo  🟡 entre límites  🔴 >arriba  (menos es mejor)",
  cpm:       "🟢 <abajo  🟡 entre límites  🔴 >arriba  (menos es mejor)",
  frequency: "🟢 <abajo  🟡 entre límites  🔴 >arriba  (menos es mejor)",
  cpa:       "🟢 <abajo  🟡 entre límites  🔴 >arriba  (menos es mejor)",
};

export function ThresholdForm({ tenantId, rows }: Props) {
  const initMap = Object.fromEntries(
    rows.map((r) => [r.metric, { lower: r.lowerBound.toString(), upper: r.upperBound.toString() }])
  );

  // Fill in defaults for missing metrics
  for (const m of METRIC_ORDER) {
    if (!initMap[m]) {
      initMap[m] = {
        lower: DEFAULT_THRESHOLDS[m].lowerBound.toString(),
        upper: DEFAULT_THRESHOLDS[m].upperBound.toString(),
      };
    }
  }

  const [values, setValues] = useState<Record<string, { lower: string; upper: string }>>(initMap);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customMetrics = new Set(rows.map((r) => r.metric));

  async function handleSave(metric: MetricKey) {
    setSaving(metric);
    setErrors((e) => ({ ...e, [metric]: "" }));
    const result = await upsertThreshold({
      metric,
      lowerBound: parseFloat(values[metric].lower),
      upperBound: parseFloat(values[metric].upper),
      tenantId,
    });
    if (!result.success) setErrors((e) => ({ ...e, [metric]: result.error }));
    setSaving(null);
  }

  async function handleReset(metric: MetricKey) {
    setSaving(`reset-${metric}`);
    await resetThreshold(tenantId, metric);
    setValues((v) => ({
      ...v,
      [metric]: {
        lower: DEFAULT_THRESHOLDS[metric].lowerBound.toString(),
        upper: DEFAULT_THRESHOLDS[metric].upperBound.toString(),
      },
    }));
    setSaving(null);
  }

  return (
    <div className="space-y-4">
      {METRIC_ORDER.map((metric) => {
        const isCustom = customMetrics.has(metric);
        const val = values[metric];

        return (
          <div
            key={metric}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#f1f5f9]">{METRIC_LABELS[metric]}</span>
                {isCustom && (
                  <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                    Personalizado
                  </span>
                )}
                <p className="mt-0.5 text-xs text-[#64748b]">{METRIC_HINT[metric]}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <SemaphoreBadge color="green" label="Verde" size="sm" />
                <SemaphoreBadge color="yellow" label="Amarillo" size="sm" />
                <SemaphoreBadge color="red" label="Rojo" size="sm" />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#94a3b8]">Límite inferior</span>
                <input
                  type="number"
                  step="any"
                  value={val.lower}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [metric]: { ...v[metric], lower: e.target.value } }))
                  }
                  className="w-28 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#94a3b8]">Límite superior</span>
                <input
                  type="number"
                  step="any"
                  value={val.upper}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [metric]: { ...v[metric], upper: e.target.value } }))
                  }
                  className="w-28 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </label>

              <button
                onClick={() => handleSave(metric)}
                disabled={saving === metric}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/30 disabled:opacity-50"
              >
                <Save size={12} />
                {saving === metric ? "Guardando…" : "Guardar"}
              </button>

              {isCustom && (
                <button
                  onClick={() => handleReset(metric)}
                  disabled={saving === `reset-${metric}`}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#94a3b8] transition hover:bg-white/[0.08] disabled:opacity-50"
                  title="Restaurar valores por defecto"
                >
                  <RotateCcw size={12} />
                  {saving === `reset-${metric}` ? "…" : "Restablecer"}
                </button>
              )}
            </div>

            {errors[metric] && (
              <p className="mt-2 text-xs text-[#f87171]">{errors[metric]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
