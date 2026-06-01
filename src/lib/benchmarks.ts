/**
 * Semaphore thresholds and classification logic.
 *
 * For "higher is better" metrics (ROAS, CTR):
 *   green  → value >= upperBound
 *   yellow → value >= lowerBound && value < upperBound
 *   red    → value < lowerBound
 *
 * For "lower is better" metrics (CPC, CPM, Frequency, CPA):
 *   green  → value <= lowerBound
 *   yellow → value <= upperBound && value > lowerBound
 *   red    → value > upperBound
 */

export type SemaphoreColor = "green" | "yellow" | "red";

export type MetricKey = "roas" | "ctr" | "cpc" | "cpm" | "frequency" | "cpa";

export interface ThresholdBounds {
  lowerBound: number;
  upperBound: number;
}

const HIGHER_IS_BETTER: Set<MetricKey> = new Set(["roas", "ctr"]);

export function isHigherBetter(metric: MetricKey): boolean {
  return HIGHER_IS_BETTER.has(metric);
}

/** Fashion/textile industry defaults. Used when no DB override exists. */
export const DEFAULT_THRESHOLDS: Record<MetricKey, ThresholdBounds> = {
  roas:      { lowerBound: 1.5,  upperBound: 3.0  },
  ctr:       { lowerBound: 0.6,  upperBound: 1.2  },
  cpc:       { lowerBound: 0.50, upperBound: 1.20 },
  cpm:       { lowerBound: 8.0,  upperBound: 18.0 },
  frequency: { lowerBound: 3.0,  upperBound: 5.0  },
  cpa:       { lowerBound: 15.0, upperBound: 35.0 },
};

export function getSemaphore(
  metric: MetricKey,
  value: number,
  bounds: ThresholdBounds = DEFAULT_THRESHOLDS[metric]
): SemaphoreColor {
  if (!isFinite(value) || isNaN(value)) return "red";

  if (isHigherBetter(metric)) {
    if (value >= bounds.upperBound) return "green";
    if (value >= bounds.lowerBound) return "yellow";
    return "red";
  } else {
    if (value <= bounds.lowerBound) return "green";
    if (value <= bounds.upperBound) return "yellow";
    return "red";
  }
}

export const METRIC_LABELS: Record<MetricKey, string> = {
  roas:      "ROAS",
  ctr:       "CTR",
  cpc:       "CPC",
  cpm:       "CPM",
  frequency: "Frecuencia",
  cpa:       "CPA",
};
