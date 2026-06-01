import { prisma } from "@/lib/db";
import { generateReportForTenant } from "@/lib/ai/report-generator";
import { logger } from "@/lib/logger";

/** Last full Mon–Sun week (Monday 00:00 → Sunday 00:00 exclusive) */
function lastFullWeek(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const daysToLastSun = day === 0 ? 7 : day;
  const end = new Date(now);
  end.setDate(now.getDate() - daysToLastSun);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { start, end };
}

export async function runReportGeneration() {
  logger.info("Iniciando generación de informes semanales");
  const { start, end } = lastFullWeek();

  const tenants = await prisma.tenant.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    try {
      // Skip if already generated for this period
      const existing = await prisma.report.findFirst({
        where: { tenantId: tenant.id, periodStart: start, periodEnd: end },
      });
      if (existing) {
        logger.info({ tenantId: tenant.id }, "Informe ya existe para este período, saltando");
        continue;
      }

      const result = await generateReportForTenant(tenant.id, start, end);

      await prisma.report.create({
        data: {
          tenantId: tenant.id,
          periodStart: start,
          periodEnd: end,
          narrative: result.narrative,
          actionCards: result.actionCards as unknown as import("@prisma/client").Prisma.InputJsonValue,
          version: 1,
          status: "DRAFT",
          aiModel: result.aiModel,
        },
      });

      logger.info({ tenantId: tenant.id, tenant: tenant.name }, "Informe generado exitosamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ tenantId: tenant.id, tenant: tenant.name, error: message },
        "Error generando informe — continuando con siguiente tenant");
    }
  }

  logger.info("Generación de informes semanales completada");
}
