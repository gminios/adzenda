/**
 * Sincroniza la jerarquía de Meta Ads: Campaign → AdSet → Ad
 * Usa upsert para idempotencia — se puede correr múltiples veces.
 */
import { prisma } from "@/lib/db";
import { metaGetAllPages } from "@/lib/meta/rate-limiter";
import { logger } from "@/lib/logger";
import type { MetaCampaign, MetaAdSet, MetaAd } from "@/types/meta";

const BASE = "https://graph.facebook.com/v21.0";
const LIMIT = 100;

async function syncCampaigns(
  adAccountId: string,
  metaAccountId: string,
  tenantId: string,
  token: string
): Promise<void> {
  const campaigns = await metaGetAllPages<MetaCampaign>(
    `${BASE}/${metaAccountId}/campaigns?fields=id,name,status,objective,start_time,stop_time&limit=${LIMIT}&access_token=${token}`
  );

  for (const c of campaigns) {
    await prisma.campaign.upsert({
      where: { adAccountId_metaCampaignId: { adAccountId, metaCampaignId: c.id } },
      create: {
        adAccountId, tenantId, metaCampaignId: c.id,
        name: c.name, status: c.status,
        objective: c.objective ?? null,
        startDate: c.start_time ? new Date(c.start_time) : null,
        endDate: c.stop_time ? new Date(c.stop_time) : null,
      },
      update: {
        name: c.name, status: c.status,
        objective: c.objective ?? null,
        startDate: c.start_time ? new Date(c.start_time) : null,
        endDate: c.stop_time ? new Date(c.stop_time) : null,
      },
    });
  }

  logger.debug({ adAccountId, count: campaigns.length }, "Campaigns synced");
}

async function syncAdSets(
  adAccountId: string,
  metaAccountId: string,
  tenantId: string,
  token: string
): Promise<void> {
  const dbCampaigns = await prisma.campaign.findMany({
    where: { adAccountId },
    select: { id: true, metaCampaignId: true },
  });
  const campaignMap = new Map(dbCampaigns.map((c) => [c.metaCampaignId, c.id]));

  // Una sola llamada paginada al nivel de cuenta en vez de una por campaña
  const adSets = await metaGetAllPages<MetaAdSet>(
    `${BASE}/${metaAccountId}/adsets?fields=id,campaign_id,name,status,daily_budget,lifetime_budget&limit=${LIMIT}&access_token=${token}`
  );

  for (const s of adSets) {
    const campaignId = campaignMap.get(s.campaign_id);
    if (!campaignId) continue;

    await prisma.adSet.upsert({
      where: { campaignId_metaAdSetId: { campaignId, metaAdSetId: s.id } },
      create: {
        campaignId, tenantId, metaAdSetId: s.id,
        name: s.name, status: s.status,
        dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) / 100 : null,
        lifetimeBudget: s.lifetime_budget ? parseFloat(s.lifetime_budget) / 100 : null,
      },
      update: {
        name: s.name, status: s.status,
        dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) / 100 : null,
        lifetimeBudget: s.lifetime_budget ? parseFloat(s.lifetime_budget) / 100 : null,
      },
    });
  }

  logger.debug({ adAccountId, count: adSets.length }, "AdSets synced");
}

async function syncAds(
  adAccountId: string,
  metaAccountId: string,
  tenantId: string,
  token: string
): Promise<void> {
  const dbAdSets = await prisma.adSet.findMany({
    where: { campaign: { adAccountId } },
    select: { id: true, metaAdSetId: true },
  });
  const adSetMap = new Map(dbAdSets.map((s) => [s.metaAdSetId, s.id]));

  // Una sola llamada paginada al nivel de cuenta en vez de una por adset
  const ads = await metaGetAllPages<MetaAd>(
    `${BASE}/${metaAccountId}/ads?fields=id,adset_id,name,status,creative&limit=${LIMIT}&access_token=${token}`
  );

  for (const ad of ads) {
    const adSetId = adSetMap.get(ad.adset_id);
    if (!adSetId) continue;

    await prisma.ad.upsert({
      where: { adSetId_metaAdId: { adSetId, metaAdId: ad.id } },
      create: {
        adSetId, tenantId, metaAdId: ad.id,
        name: ad.name, status: ad.status,
        creativeId: ad.creative?.id ?? null,
      },
      update: {
        name: ad.name, status: ad.status,
        creativeId: ad.creative?.id ?? null,
      },
    });
  }

  logger.debug({ adAccountId, count: ads.length }, "Ads synced");
}

export async function syncHierarchy(
  adAccountId: string,
  metaAccountId: string,
  tenantId: string,
  accessToken: string
): Promise<void> {
  await syncCampaigns(adAccountId, metaAccountId, tenantId, accessToken);
  await syncAdSets(adAccountId, metaAccountId, tenantId, accessToken);
  await syncAds(adAccountId, metaAccountId, tenantId, accessToken);
  logger.info({ adAccountId }, "Hierarchy sync complete");
}
