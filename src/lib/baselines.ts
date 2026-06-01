import { prisma } from "@/lib/db";
import type { MetricKey, ThresholdBounds } from "@/lib/benchmarks";

const ALL_METRICS: MetricKey[] = ["roas", "ctr", "cpc", "cpm", "frequency", "cpa"];

const BASELINE_WINDOW_DAYS = 60;
const MIN_DAILY_SAMPLES = 10;

export type TenantBaselines = Partial<
  Record<MetricKey, ThresholdBounds & { sampleDays: number }>
>;

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (idx - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}

interface DailyTotals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

function deriveDailyMetric(d: DailyTotals, metric: MetricKey): number | null {
  switch (metric) {
    case "roas":
      return d.spend > 0 ? d.conversionValue / d.spend : null;
    case "ctr":
      return d.impressions > 0 ? (d.clicks / d.impressions) * 100 : null;
    case "cpc":
      return d.clicks > 0 ? d.spend / d.clicks : null;
    case "cpm":
      return d.impressions > 0 ? (d.spend / d.impressions) * 1000 : null;
    case "frequency":
      return d.reach > 0 ? d.impressions / d.reach : null;
    case "cpa":
      return d.conversions > 0 ? d.spend / d.conversions : null;
  }
}

export async function computeTenantBaselines(
  tenantId: string,
  windowDays = BASELINE_WINDOW_DAYS
): Promise<TenantBaselines> {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  since.setDate(since.getDate() - windowDays);

  const rows = await prisma.dailyInsight.findMany({
    where: { tenantId, date: { gte: since } },
    select: {
      date: true,
      spend: true,
      impressions: true,
      reach: true,
      clicks: true,
      conversions: true,
      conversionValue: true,
    },
  });

  if (rows.length === 0) return {};

  const byDay = new Map<string, DailyTotals>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    const acc = byDay.get(key) ?? {
      spend: 0, impressions: 0, reach: 0, clicks: 0,
      conversions: 0, conversionValue: 0,
    };
    acc.spend          += r.spend.toNumber();
    acc.impressions    += r.impressions;
    acc.reach          += r.reach;
    acc.clicks         += r.clicks;
    acc.conversions    += r.conversions;
    acc.conversionValue += r.conversionValue.toNumber();
    byDay.set(key, acc);
  }

  const daily = Array.from(byDay.values());

  const result: TenantBaselines = {};

  for (const metric of ALL_METRICS) {
    const samples: number[] = [];
    for (const d of daily) {
      const v = deriveDailyMetric(d, metric);
      if (v !== null && isFinite(v)) samples.push(v);
    }
    if (samples.length < MIN_DAILY_SAMPLES) continue;

    samples.sort((a, b) => a - b);
    const p25 = percentile(samples, 25);
    const p75 = percentile(samples, 75);

    // Bounds always stored ascending; getSemaphore reads direction from metric.
    result[metric] = {
      lowerBound: p25,
      upperBound: p75,
      sampleDays: samples.length,
    };
  }

  return result;
}
