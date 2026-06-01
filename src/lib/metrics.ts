/**
 * Weekly metrics aggregation from DailyInsight rows.
 * All monetary values in tenant currency (as-is from DB).
 */

export interface WeeklyMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  // Derived
  roas: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  cpa: number;
}

interface InsightRow {
  spend: { toNumber(): number };
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValue: { toNumber(): number };
}

export function aggregateInsights(rows: InsightRow[]): WeeklyMetrics {
  let spend = 0, impressions = 0, reach = 0, clicks = 0;
  let conversions = 0, conversionValue = 0;

  for (const r of rows) {
    spend          += r.spend.toNumber();
    impressions    += r.impressions;
    reach          += r.reach;
    clicks         += r.clicks;
    conversions    += r.conversions;
    conversionValue += r.conversionValue.toNumber();
  }

  const roas      = spend > 0 ? conversionValue / spend : 0;
  const ctr       = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc       = clicks > 0 ? spend / clicks : 0;
  const cpm       = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const cpa       = conversions > 0 ? spend / conversions : 0;

  return { spend, impressions, reach, clicks, conversions, conversionValue,
           roas, ctr, cpc, cpm, frequency, cpa };
}

/**
 * Percentage change between two values. Returns null if base is 0.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
