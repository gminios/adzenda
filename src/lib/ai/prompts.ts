/**
 * System and user prompts for weekly report generation.
 * Tone: trusted consultant, plain Latin American Spanish, no jargon.
 * Never mention Claude, AI, or automation.
 */

export const SYSTEM_PROMPT = `Sos un consultor de marketing digital especializado en marcas de moda y textil latinoamericana. Trabajás con pequeñas y medianas empresas que venden ropa, accesorios y calzado.

Tu rol es transformar datos de publicidad en Meta Ads en explicaciones claras y útiles para dueños de negocio que no son expertos en marketing digital. Tu lenguaje es cálido, directo y profesional — como si fueras un amigo que sabe mucho de publicidad y les explica cómo les fue esta semana.

Reglas importantes:
- Nunca uses palabras en inglés si existe equivalente en español (decí "alcance" no "reach", "clics" no "clicks", "conversiones" no "conversions")
- Cuando uses una métrica técnica (ROAS, CTR, CPM, CPA), explicala brevemente entre paréntesis la primera vez
- Mencioná las campañas por su nombre real
- Sé específico con los números: no digas "el gasto aumentó" sino "gastaste $45.200 esta semana, un 12% más que la semana pasada"
- Cuando el rendimiento es bueno, celebralo. Cuando es malo, explicá por qué puede estar pasando y qué hacer
- Contextualizá para moda/textil: mencioná estacionalidad, colecciones, temporadas cuando sea relevante
- Nunca menciones que esto fue generado por IA o de forma automática`;

interface MetricSummary {
  spend: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  frequency: number;
  conversions: number;
  conversionValue: number;
  impressions: number;
  reach: number;
}

interface CampaignSummary {
  name: string;
  status: string;
  spend: number;
  roas: number;
  ctr: number;
  cpa: number;
  conversions: number;
}

interface ReportContext {
  tenantName: string;
  currency: string;
  periodStart: string; // "dd/mm/yyyy"
  periodEnd: string;
  tone: "simple" | "detailed";
  current: MetricSummary;
  previous: MetricSummary;
  campaigns: CampaignSummary[];
  semaphores: Record<string, "green" | "yellow" | "red">;
}

function fmtN(v: number, currency?: string) {
  if (currency) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(v);
  }
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(v);
}

function semaphoreLabel(s: "green" | "yellow" | "red") {
  return s === "green" ? "✅ bueno" : s === "yellow" ? "⚠️ regular" : "🔴 por mejorar";
}

export function buildUserPrompt(ctx: ReportContext): string {
  const { current: c, previous: p, currency } = ctx;

  const pct = (cur: number, prev: number) => {
    if (prev === 0) return "sin dato previo";
    const d = ((cur - prev) / prev) * 100;
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
  };

  const campaignsText = ctx.campaigns
    .map((cam) =>
      `  - "${cam.name}" [${cam.status}]: gasto ${fmtN(cam.spend, currency)}, ROAS ${cam.roas.toFixed(2)}x, CPA ${fmtN(cam.cpa, currency)}, conversiones ${cam.conversions}`
    )
    .join("\n");

  const paragraphs = ctx.tone === "simple" ? "2-3" : "4-5";

  return `Generá el informe semanal de publicidad para el cliente "${ctx.tenantName}".

**PERÍODO:** ${ctx.periodStart} al ${ctx.periodEnd}

**MÉTRICAS GENERALES — SEMANA ACTUAL:**
- Gasto total: ${fmtN(c.spend, currency)} (${pct(c.spend, p.spend)} vs semana anterior)
- ROAS: ${c.roas.toFixed(2)}x (${pct(c.roas, p.roas)}) → ${semaphoreLabel(ctx.semaphores.roas)}
- CTR: ${c.ctr.toFixed(2)}% (${pct(c.ctr, p.ctr)}) → ${semaphoreLabel(ctx.semaphores.ctr)}
- CPC: ${fmtN(c.cpc, currency)} (${pct(c.cpc, p.cpc)}) → ${semaphoreLabel(ctx.semaphores.cpc)}
- CPM: ${fmtN(c.cpm, currency)} (${pct(c.cpm, p.cpm)}) → ${semaphoreLabel(ctx.semaphores.cpm)}
- CPA: ${fmtN(c.cpa, currency)} (${pct(c.cpa, p.cpa)}) → ${semaphoreLabel(ctx.semaphores.cpa)}
- Frecuencia: ${c.frequency.toFixed(2)} (${pct(c.frequency, p.frequency)}) → ${semaphoreLabel(ctx.semaphores.frequency)}
- Conversiones: ${c.conversions} (${pct(c.conversions, p.conversions)})
- Valor de conversiones: ${fmtN(c.conversionValue, currency)}
- Alcance: ${fmtN(c.reach)} personas únicas

**CAMPAÑAS ACTIVAS:**
${campaignsText || "  Sin campañas con datos en este período."}

**INSTRUCCIONES DE FORMATO:**
Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "narrative": "texto narrativo aquí — ${paragraphs} párrafos separados por doble salto de línea (\\n\\n)",
  "actionCards": [
    {
      "title": "título corto (máx 6 palabras)",
      "description": "descripción de 2-3 oraciones explicando el problema o oportunidad",
      "action": "acción concreta y específica que debe tomar el cliente (1 oración)",
      "priority": "alta" | "media" | "baja",
      "category": "presupuesto" | "creativo" | "audiencia" | "general"
    }
  ]
}

Generá exactamente 3 action cards. El JSON debe ser parseable directamente, sin bloques de código markdown.`;
}
