import { prisma } from "@/lib/db";
import {
  DEFAULT_THRESHOLDS,
  type MetricKey,
  type ThresholdBounds,
} from "@/lib/benchmarks";
import { computeTenantBaselines, type TenantBaselines } from "@/lib/baselines";

export type ThresholdSource = "target" | "manual" | "baseline" | "default";

export interface ResolvedMetric {
  bounds: ThresholdBounds;
  source: ThresholdSource;
  sampleDays?: number; // for baseline/blended baseline
}

export type ResolvedThresholds = Record<MetricKey, ResolvedMetric>;

const ALL_METRICS: MetricKey[] = ["roas", "ctr", "cpc", "cpm", "frequency", "cpa"];

export const SOURCE_LABELS: Record<ThresholdSource, string> = {
  target:   "Objetivo del cliente",
  manual:   "Ajuste manual",
  baseline: "Tu promedio últimos 60 días",
  default:  "Valor de referencia",
};

interface ResolveInput {
  tenantId: string;
  targetRoas: number | null;
  targetCpa:  number | null;
}

export async function resolveTenantThresholds(
  input: ResolveInput
): Promise<ResolvedThresholds> {
  const [manualRows, baselines] = await Promise.all([
    prisma.benchmarkThreshold.findMany({
      where: { tenantId: input.tenantId },
      select: { metric: true, lowerBound: true, upperBound: true },
    }),
    computeTenantBaselines(input.tenantId),
  ]);

  const manual = new Map<MetricKey, ThresholdBounds>();
  for (const r of manualRows) {
    manual.set(r.metric as MetricKey, {
      lowerBound: Number(r.lowerBound),
      upperBound: Number(r.upperBound),
    });
  }

  const result = {} as ResolvedThresholds;
  for (const metric of ALL_METRICS) {
    result[metric] = resolveOne(metric, manual.get(metric), baselines[metric], input);
  }
  return result;
}

/**
 * Priority per metric:
 *   1. target  (only ROAS / CPA): green = at or past target; the *other* bound
 *      comes from baseline → manual → default to preserve a yellow band.
 *   2. manual  (BenchmarkThreshold row): both bounds taken as-is.
 *   3. baseline: p25/p75 from last 60d of history.
 *   4. default: static fallback.
 */
function resolveOne(
  metric: MetricKey,
  manual: ThresholdBounds | undefined,
  baseline: TenantBaselines[MetricKey],
  input: ResolveInput
): ResolvedMetric {
  const fallback = baseline ?? manual ?? DEFAULT_THRESHOLDS[metric];

  if (metric === "roas" && input.targetRoas !== null) {
    // higher is better → target sets upperBound (green if ≥ target)
    return {
      bounds: { lowerBound: fallback.lowerBound, upperBound: input.targetRoas },
      source: "target",
    };
  }

  if (metric === "cpa" && input.targetCpa !== null) {
    // lower is better → target sets lowerBound (green if ≤ target)
    return {
      bounds: { lowerBound: input.targetCpa, upperBound: fallback.upperBound },
      source: "target",
    };
  }

  if (manual) {
    return { bounds: manual, source: "manual" };
  }

  if (baseline) {
    return {
      bounds: { lowerBound: baseline.lowerBound, upperBound: baseline.upperBound },
      source: "baseline",
      sampleDays: baseline.sampleDays,
    };
  }

  return { bounds: DEFAULT_THRESHOLDS[metric], source: "default" };
}
