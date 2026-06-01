import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";
import { aggregateInsights } from "@/lib/metrics";
import { GlassCard } from "@/components/ui/glass-card";
import { TrendChart } from "@/components/charts/trend-chart";

function getWeekLabel(date: Date): string {
  const d = new Date(date);
  // ISO week number
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `Sem ${weekNum}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TrendsPage() {
  const tenant = await resolveActiveTenant();
  if (!tenant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#64748b]">No hay clientes activos.</p>
      </div>
    );
  }

  // Last 12 weeks
  const since = new Date();
  since.setDate(since.getDate() - 84); // 12 * 7

  const rows = await prisma.dailyInsight.findMany({
    where: { tenantId: tenant.id, date: { gte: since } },
    select: {
      date: true,
      spend: true, impressions: true, reach: true, clicks: true,
      conversions: true, conversionValue: true,
    },
    orderBy: { date: "asc" },
  });

  // Group by week
  const weekMap = new Map<string, typeof rows>();
  for (const row of rows) {
    const weekStart = startOfWeek(new Date(row.date));
    const key = weekStart.toISOString();
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(row);
  }

  const weeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, weekRows]) => {
      const date = new Date(key);
      const metrics = aggregateInsights(weekRows);
      return { label: getWeekLabel(date), ...metrics };
    });

  const charts = [
    {
      title: "Gasto semanal",
      data: weeks.map((w) => ({ week: w.label, value: w.spend })),
      color: "#6366f1",
      format: "currency-ars" as const,
    },
    {
      title: "ROAS",
      data: weeks.map((w) => ({ week: w.label, value: w.roas })),
      color: "#34d399",
      format: "roas" as const,
    },
    {
      title: "CPA",
      data: weeks.map((w) => ({ week: w.label, value: w.cpa })),
      color: "#f87171",
      format: "currency-ars" as const,
    },
    {
      title: "CTR (%)",
      data: weeks.map((w) => ({ week: w.label, value: w.ctr })),
      color: "#fbbf24",
      format: "ctr" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Tendencias</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          {tenant.name} · últimas 12 semanas
        </p>
      </div>

      {weeks.length === 0 ? (
        <GlassCard hover={false}>
          <p className="py-12 text-center text-sm text-[#64748b]">
            Sin datos de tendencia. Se necesitan al menos 2 semanas de datos.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {charts.map((chart, i) => (
            <GlassCard key={chart.title} hover={false} delay={i * 0.1}>
              <h2 className="mb-4 text-sm font-semibold text-[#94a3b8]">{chart.title}</h2>
              <TrendChart
                data={chart.data}
                color={chart.color}
                format={chart.format}
              />
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
