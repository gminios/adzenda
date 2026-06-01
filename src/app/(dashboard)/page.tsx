import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";
import { aggregateInsights, pctChange } from "@/lib/metrics";
import { getSemaphore, isHigherBetter, type MetricKey } from "@/lib/benchmarks";
import {
  resolveTenantThresholds,
  SOURCE_LABELS,
  type ResolvedMetric,
} from "@/lib/threshold-resolver";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { SpendDonutChart, type SpendSlice } from "@/components/charts/spend-donut-chart";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { PERIOD_OPTIONS, type PeriodValue } from "@/lib/periods";
import { formatRelativeDate } from "@/lib/utils";

function fmtCurrency(v: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

function fmtX(v: number) {
  return `${v.toFixed(2)}x`;
}

function fmtNum(v: number) {
  return new Intl.NumberFormat("es-AR").format(Math.round(v));
}

function fmtBound(metric: MetricKey, v: number): string {
  switch (metric) {
    case "roas":      return `${v.toFixed(2)}x`;
    case "ctr":       return `${v.toFixed(2)}%`;
    case "frequency": return v.toFixed(2);
    case "cpc":
    case "cpm":
    case "cpa":       return fmtCurrency(v);
  }
}

function semaphoreTooltip(metric: MetricKey, r: ResolvedMetric): string {
  const higherBetter = isHigherBetter(metric);
  const greenLine = higherBetter
    ? `Verde si ≥ ${fmtBound(metric, r.bounds.upperBound)}`
    : `Verde si ≤ ${fmtBound(metric, r.bounds.lowerBound)}`;
  const redLine = higherBetter
    ? `Rojo si < ${fmtBound(metric, r.bounds.lowerBound)}`
    : `Rojo si > ${fmtBound(metric, r.bounds.upperBound)}`;
  const source = SOURCE_LABELS[r.source];
  const sampleNote = r.source === "baseline" && r.sampleDays
    ? ` (${r.sampleDays} días con datos)` : "";
  return `${source}${sampleNote}\n${greenLine}\n${redLine}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const tenant = await resolveActiveTenant();

  if (!tenant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#64748b]">No hay clientes activos. Creá uno en Configuración → Clientes.</p>
      </div>
    );
  }

  const { period: periodParam } = await searchParams;
  const selectedPeriod: PeriodValue =
    PERIOD_OPTIONS.find((p) => p.value === periodParam)?.value ?? "7d";
  const periodMeta = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)!;
  const periodDays = periodMeta.days;

  // Date ranges
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const currentEnd   = new Date(todayMidnight); // exclusive
  const currentStart = new Date(todayMidnight);
  currentStart.setDate(currentStart.getDate() - periodDays);

  const prevEnd   = new Date(currentStart);
  const prevStart = new Date(currentStart);
  prevStart.setDate(prevStart.getDate() - periodDays);

  const [currentRows, prevRows, campaignSpendRows] = await Promise.all([
    prisma.dailyInsight.findMany({
      where: {
        tenantId: tenant.id,
        date: { gte: currentStart, lt: currentEnd },
      },
      select: { spend: true, impressions: true, reach: true, clicks: true,
                conversions: true, conversionValue: true },
    }),
    prisma.dailyInsight.findMany({
      where: {
        tenantId: tenant.id,
        date: { gte: prevStart, lt: prevEnd },
      },
      select: { spend: true, impressions: true, reach: true, clicks: true,
                conversions: true, conversionValue: true },
    }),
    prisma.dailyInsight.findMany({
      where: {
        tenantId: tenant.id,
        date: { gte: currentStart, lt: currentEnd },
      },
      select: {
        spend: true,
        ad: { select: { adSet: { select: { campaign: { select: { name: true } } } } } },
      },
    }),
  ]);

  const cur = aggregateInsights(currentRows);
  const prev = aggregateInsights(prevRows);

  const resolved = await resolveTenantThresholds({
    tenantId: tenant.id,
    targetRoas: tenant.targetRoas !== null && tenant.targetRoas !== undefined
      ? Number(tenant.targetRoas) : null,
    targetCpa:  tenant.targetCpa  !== null && tenant.targetCpa  !== undefined
      ? Number(tenant.targetCpa)  : null,
  });

  const kpis: Array<{
    label: string; metric: MetricKey | "spend"; value: string;
    current: number; previous: number;
  }> = [
    { label: "Gasto",        metric: "spend",     value: fmtCurrency(cur.spend),     current: cur.spend,       previous: prev.spend },
    { label: "ROAS",         metric: "roas",      value: fmtX(cur.roas),             current: cur.roas,        previous: prev.roas },
    { label: "CPA",          metric: "cpa",       value: fmtCurrency(cur.cpa),       current: cur.cpa,         previous: prev.cpa },
    { label: "CTR",          metric: "ctr",       value: fmtPct(cur.ctr),            current: cur.ctr,         previous: prev.ctr },
    { label: "CPM",          metric: "cpm",       value: fmtCurrency(cur.cpm),       current: cur.cpm,         previous: prev.cpm },
    { label: "Frecuencia",   metric: "frequency", value: cur.frequency.toFixed(2),   current: cur.frequency,   previous: prev.frequency },
  ];

  const noData = currentRows.length === 0;

  // Spend by campaign — top 5 + "Otras"
  const campaignTotals = new Map<string, number>();
  for (const row of campaignSpendRows) {
    const name = row.ad?.adSet?.campaign?.name ?? "Sin campaña";
    campaignTotals.set(name, (campaignTotals.get(name) ?? 0) + Number(row.spend));
  }
  const sorted = Array.from(campaignTotals.entries()).sort((a, b) => b[1] - a[1]);
  const totalSpend = sorted.reduce((s, [, v]) => s + v, 0);
  const top5 = sorted.slice(0, 5);
  const othersSpend = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
  if (othersSpend > 0) top5.push(["Otras", othersSpend]);
  const spendSlices: SpendSlice[] = top5.map(([name, spend]) => ({
    name,
    spend,
    pct: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
  }));

  // Last sync info
  const lastSync = await prisma.syncLog.findFirst({
    where: { tenantId: tenant.id, status: "SUCCESS" },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Resumen</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            {tenant.name} · {periodMeta.description.toLowerCase()}
          </p>
        </div>
        {lastSync?.finishedAt && (
          <p className="text-xs text-[#64748b]">
            Última sync: {formatRelativeDate(lastSync.finishedAt)}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <PeriodSelector value={selectedPeriod} />
      </div>

      {noData ? (
        <GlassCard hover={false}>
          <p className="py-12 text-center text-sm text-[#64748b]">
            Sin datos para {periodMeta.description.toLowerCase()}. Sincronizá la cuenta en{" "}
            <span className="text-indigo-400">Configuración → Clientes</span>.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* KPI cards grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi, i) => {
              const isMetric = kpi.metric !== "spend";
              const r = isMetric ? resolved[kpi.metric as MetricKey] : null;
              return (
                <KpiCard
                  key={kpi.label}
                  label={kpi.label}
                  metric={kpi.metric}
                  value={kpi.value}
                  semaphore={
                    r ? getSemaphore(kpi.metric as MetricKey, kpi.current, r.bounds) : null
                  }
                  semaphoreTitle={
                    r ? semaphoreTooltip(kpi.metric as MetricKey, r) : undefined
                  }
                  pctChange={pctChange(kpi.current, kpi.previous)}
                  pctChangeLabel="vs período previo"
                  delay={i * 0.07}
                />
              );
            })}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <GlassCard hover={false} delay={0.4}>
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">Alcance</p>
              <p className="mt-2 text-2xl font-bold text-[#f1f5f9]">{fmtNum(cur.reach)}</p>
              <p className="mt-1 text-xs text-[#94a3b8]">personas únicas</p>
            </GlassCard>
            <GlassCard hover={false} delay={0.47}>
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">Impresiones</p>
              <p className="mt-2 text-2xl font-bold text-[#f1f5f9]">{fmtNum(cur.impressions)}</p>
              <p className="mt-1 text-xs text-[#94a3b8]">total de vistas</p>
            </GlassCard>
            <GlassCard hover={false} delay={0.54}>
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">Conversiones</p>
              <p className="mt-2 text-2xl font-bold text-[#f1f5f9]">{fmtNum(cur.conversions)}</p>
              <p className="mt-1 text-xs text-[#94a3b8]">
                valor: {fmtCurrency(cur.conversionValue)}
              </p>
            </GlassCard>
          </div>

          {/* Spend by campaign donut */}
          {spendSlices.length > 0 && (
            <GlassCard hover={false} delay={0.6}>
              <h2 className="mb-4 text-sm font-semibold text-[#94a3b8]">
                Distribución de gasto por campaña
              </h2>
              <SpendDonutChart data={spendSlices} />
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
