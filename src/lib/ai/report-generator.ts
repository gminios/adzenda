import { prisma } from "@/lib/db";
import { anthropic } from "@/lib/ai/client";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { aggregateInsights } from "@/lib/metrics";
import { getSemaphore, DEFAULT_THRESHOLDS, type MetricKey } from "@/lib/benchmarks";
import { logger } from "@/lib/logger";

const AI_MODEL = "claude-haiku-4-5-20251001";

export interface ActionCard {
  title: string;
  description: string;
  action: string;
  priority: "alta" | "media" | "baja";
  category: "presupuesto" | "creativo" | "audiencia" | "general";
}

export interface GeneratedReport {
  narrative: string;
  actionCards: ActionCard[];
  aiModel: string;
}

function fmt(date: Date): string {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateReportForTenant(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<GeneratedReport> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { name: true, industry: true, reportTone: true },
  });

  const adAccount = await prisma.adAccount.findFirst({
    where: { tenantId, active: true },
    select: { currency: true },
  });
  const currency = adAccount?.currency ?? "ARS";

  // Date ranges
  const prevEnd   = new Date(periodStart);
  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - 7);

  const [currentRows, prevRows] = await Promise.all([
    prisma.dailyInsight.findMany({
      where: { tenantId, date: { gte: periodStart, lt: periodEnd } },
      select: { spend: true, impressions: true, reach: true, clicks: true,
                conversions: true, conversionValue: true },
    }),
    prisma.dailyInsight.findMany({
      where: { tenantId, date: { gte: prevStart, lt: prevEnd } },
      select: { spend: true, impressions: true, reach: true, clicks: true,
                conversions: true, conversionValue: true },
    }),
  ]);

  const cur  = aggregateInsights(currentRows);
  const prev = aggregateInsights(prevRows);

  // Load tenant threshold overrides
  const dbThresholds = await prisma.benchmarkThreshold.findMany({
    where: { tenantId },
    select: { metric: true, lowerBound: true, upperBound: true },
  });
  const thresholds = { ...DEFAULT_THRESHOLDS };
  for (const t of dbThresholds) {
    const key = t.metric as MetricKey;
    thresholds[key] = { lowerBound: Number(t.lowerBound), upperBound: Number(t.upperBound) };
  }

  // Semaphores for context
  const semaphores = {
    roas:      getSemaphore("roas",      cur.roas,      thresholds.roas),
    ctr:       getSemaphore("ctr",       cur.ctr,       thresholds.ctr),
    cpc:       getSemaphore("cpc",       cur.cpc,       thresholds.cpc),
    cpm:       getSemaphore("cpm",       cur.cpm,       thresholds.cpm),
    cpa:       getSemaphore("cpa",       cur.cpa,       thresholds.cpa),
    frequency: getSemaphore("frequency", cur.frequency, thresholds.frequency),
  };

  // Campaign-level data
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId },
    select: {
      name: true, status: true,
      adSets: {
        select: {
          ads: {
            select: {
              dailyInsights: {
                where: { date: { gte: periodStart, lt: periodEnd } },
                select: { spend: true, impressions: true, reach: true, clicks: true,
                          conversions: true, conversionValue: true },
              },
            },
          },
        },
      },
    },
  });

  const campaignSummaries = campaigns
    .map((camp) => {
      const rows = camp.adSets.flatMap((s) => s.ads.flatMap((a) => a.dailyInsights));
      const m = aggregateInsights(rows);
      return { name: camp.name, status: camp.status, spend: m.spend, roas: m.roas,
               ctr: m.ctr, cpa: m.cpa, conversions: m.conversions };
    })
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8); // top 8 campaigns by spend

  const prompt = buildUserPrompt({
    tenantName: tenant.name,
    currency,
    periodStart: fmt(periodStart),
    periodEnd: fmt(periodEnd),
    tone: (tenant.reportTone as "simple" | "detailed") ?? "simple",
    current: cur,
    previous: prev,
    campaigns: campaignSummaries,
    semaphores,
  });

  logger.info({ tenantId, periodStart, periodEnd }, "Generando informe con IA");

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Parse JSON — strip markdown code blocks if present
  const cleaned = rawText.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();

  let parsed: { narrative: string; actionCards: ActionCard[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error({ rawText }, "Error parseando respuesta de IA");
    throw new Error("La IA devolvió un formato inesperado. Intentá regenerar el informe.");
  }

  if (!parsed.narrative || !Array.isArray(parsed.actionCards)) {
    throw new Error("Respuesta de IA incompleta. Intentá regenerar el informe.");
  }

  return { narrative: parsed.narrative, actionCards: parsed.actionCards, aiModel: AI_MODEL };
}
