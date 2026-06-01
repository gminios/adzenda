import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";
import { GlassCard } from "@/components/ui/glass-card";
import { ThresholdForm } from "@/components/dashboard/threshold-form";
import { DEFAULT_THRESHOLDS, type MetricKey } from "@/lib/benchmarks";

export default async function ThresholdsPage() {
  const tenant = await resolveActiveTenant();

  if (!tenant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#64748b]">No hay clientes activos.</p>
      </div>
    );
  }

  const dbThresholds = await prisma.benchmarkThreshold.findMany({
    where: { tenantId: tenant.id },
    select: { metric: true, lowerBound: true, upperBound: true },
  });

  const rows = dbThresholds.map((t) => ({
    metric: t.metric as MetricKey,
    lowerBound: Number(t.lowerBound),
    upperBound: Number(t.upperBound),
    isCustom: true,
  }));

  // Add defaults for metrics not overridden
  const customMetrics = new Set(rows.map((r) => r.metric));
  for (const [metric, bounds] of Object.entries(DEFAULT_THRESHOLDS)) {
    if (!customMetrics.has(metric as MetricKey)) {
      rows.push({ metric: metric as MetricKey, ...bounds, isCustom: false });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Umbrales de semáforo</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          {tenant.name} · ajustá los límites para verde, amarillo y rojo por métrica
        </p>
      </div>

      <GlassCard hover={false}>
        <ThresholdForm tenantId={tenant.id} rows={rows} />
      </GlassCard>

      <p className="text-xs text-[#64748b]">
        Los valores por defecto corresponden a benchmarks de moda/textil latinoamericano.
        Los cambios aplican solo para este cliente.
      </p>
    </div>
  );
}
