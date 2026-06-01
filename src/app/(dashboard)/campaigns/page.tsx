import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";
import { GlassCard } from "@/components/ui/glass-card";
import { CampaignTable } from "@/components/dashboard/campaign-table";

function sumInsights(rows: Array<{
  spend: { toNumber(): number };
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: { toNumber(): number };
}>) {
  let spend = 0, impressions = 0, clicks = 0, conversions = 0, conversionValue = 0;
  for (const r of rows) {
    spend          += r.spend.toNumber();
    impressions    += r.impressions;
    clicks         += r.clicks;
    conversions    += r.conversions;
    conversionValue += r.conversionValue.toNumber();
  }
  const roas = spend > 0 ? conversionValue / spend : 0;
  const ctr  = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc  = clicks > 0 ? spend / clicks : 0;
  const cpa  = conversions > 0 ? spend / conversions : 0;
  return { spend, impressions, clicks, conversions, conversionValue, roas, ctr, cpc, cpa };
}

export default async function CampaignsPage() {
  const tenant = await resolveActiveTenant();
  if (!tenant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#64748b]">No hay clientes activos.</p>
      </div>
    );
  }

  // Last 30 days
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, status: true,
      adSets: {
        select: {
          id: true, name: true, status: true,
          ads: {
            select: {
              id: true, name: true, status: true,
              dailyInsights: {
                where: { date: { gte: since } },
                select: {
                  spend: true, impressions: true, clicks: true,
                  conversions: true, conversionValue: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Aggregate metrics per level
  const tableData = campaigns.map((campaign) => {
    const adSets = campaign.adSets.map((adSet) => {
      const ads = adSet.ads.map((ad) => ({
        id: ad.id, name: ad.name, status: ad.status,
        ...sumInsights(ad.dailyInsights),
      }));
      const adSetMetrics = sumInsights(adSet.ads.flatMap((a) => a.dailyInsights));
      return { id: adSet.id, name: adSet.name, status: adSet.status, ...adSetMetrics, ads };
    });
    const campaignMetrics = sumInsights(
      campaign.adSets.flatMap((s) => s.ads.flatMap((a) => a.dailyInsights))
    );
    return { id: campaign.id, name: campaign.name, status: campaign.status, ...campaignMetrics, adSets };
  });

  // Sort campaigns by spend desc
  tableData.sort((a, b) => b.spend - a.spend);

  // Get currency from first ad account
  const adAccount = await prisma.adAccount.findFirst({
    where: { tenantId: tenant.id },
    select: { currency: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Campañas</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          {tenant.name} · últimos 30 días · expandí cada fila para ver adsets y anuncios
        </p>
      </div>

      <GlassCard hover={false}>
        {tableData.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#64748b]">
            Sin campañas. Sincronizá la cuenta primero.
          </p>
        ) : (
          <CampaignTable campaigns={tableData} currency={adAccount?.currency ?? "ARS"} />
        )}
      </GlassCard>
    </div>
  );
}
