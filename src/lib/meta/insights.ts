/**
 * Sincroniza daily insights a nivel de ad para un ad account.
 * Re-ingiere los últimos 3 días (los datos se asientan en ~72h).
 * Usa upsert por (adId, date) para idempotencia.
 */
import { prisma } from "@/lib/db";
import { metaFetch } from "@/lib/meta/rate-limiter";
import { logger } from "@/lib/logger";
import type { MetaInsight, MetaPagedResponse } from "@/types/meta";

const BASE = "https://graph.facebook.com/v21.0";

const FIELDS = [
  "ad_id", "date_start", "spend", "impressions", "reach",
  "clicks", "cpc", "cpm", "ctr", "frequency", "actions", "action_values",
].join(",");

// Tipos de conversión que contamos
const CONV_TYPES = new Set([
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.purchase",
]);

function sumActions(arr: MetaInsight["actions"], asFloat = false): number {
  return (arr ?? [])
    .filter((a) => CONV_TYPES.has(a.action_type))
    .reduce((s, a) => s + (asFloat ? parseFloat(a.value) : parseInt(a.value, 10)), 0);
}

export async function syncInsights(
  metaAccountId: string,
  adAccountDbId: string,
  tenantId: string,
  accessToken: string,
  since: Date,
  until: Date
): Promise<number> {
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = until.toISOString().slice(0, 10);
  const cutoff72h = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Pre-cargamos el mapa metaAdId → dbId para evitar N queries
  const adRows = await prisma.ad.findMany({
    where: { adSet: { campaign: { adAccountId: adAccountDbId } } },
    select: { id: true, metaAdId: true },
  });
  const adMap = new Map(adRows.map((a) => [a.metaAdId, a.id]));

  const firstUrl =
    `${BASE}/${metaAccountId}/insights` +
    `?fields=${FIELDS}` +
    `&level=ad` +
    `&time_range={"since":"${sinceStr}","until":"${untilStr}"}` +
    `&time_increment=1` +
    `&limit=100` +
    `&access_token=${accessToken}`;

  let nextUrl: string | undefined = firstUrl;
  let total = 0;

  while (nextUrl) {
    const res = await metaFetch(nextUrl);
    const page: MetaPagedResponse<MetaInsight> = await res.json();

    if (page.error) {
      throw new Error(`Meta API error ${page.error.code}: ${page.error.message}`);
    }

    for (const row of page.data) {
      const adId = adMap.get(row.ad_id);
      if (!adId) continue; // ad no sincronizado todavía

      const date = new Date(`${row.date_start}T00:00:00.000Z`);
      const provisional = date >= cutoff72h;

      const payload = {
        spend: parseFloat(row.spend),
        impressions: parseInt(row.impressions, 10),
        reach: parseInt(row.reach, 10),
        clicks: parseInt(row.clicks, 10),
        cpc: row.cpc ? parseFloat(row.cpc) : null,
        cpm: row.cpm ? parseFloat(row.cpm) : null,
        ctr: row.ctr ? parseFloat(row.ctr) : null,
        frequency: row.frequency ? parseFloat(row.frequency) : null,
        conversions: sumActions(row.actions),
        conversionValue: sumActions(row.action_values, true),
        provisional,
      };

      await prisma.dailyInsight.upsert({
        where: { adId_date: { adId, date } },
        create: { adId, tenantId, date, ...payload },
        update: payload,
      });

      total++;
    }

    nextUrl = page.paging?.next;
  }

  logger.info({ metaAccountId, sinceStr, untilStr, rows: total }, "Insights synced");
  return total;
}
