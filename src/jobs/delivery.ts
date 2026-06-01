import { prisma } from "@/lib/db";
import { sendReportEmail } from "@/lib/delivery/email";
import { logger } from "@/lib/logger";
import type { ActionCard } from "@/lib/ai/report-generator";

export async function runDelivery() {
  logger.info("Iniciando entrega automática de informes");

  const configs = await prisma.deliveryConfig.findMany({
    where: { autoSend: true, emailEnabled: true },
    include: { tenant: { select: { id: true, name: true } } },
  });

  for (const config of configs) {
    try {
      // Find the latest READY report for this tenant
      const report = await prisma.report.findFirst({
        where:   { tenantId: config.tenantId, status: "READY" },
        orderBy: { periodStart: "desc" },
      });

      if (!report) {
        logger.info({ tenantId: config.tenantId }, "Sin informes listos para enviar");
        continue;
      }

      // Skip if already logged a SENT for this report
      const alreadySent = await prisma.deliveryLog.findFirst({
        where: { reportId: report.id, status: "SENT" },
      });
      if (alreadySent) {
        logger.info({ reportId: report.id }, "Informe ya enviado, saltando");
        continue;
      }

      const actionCards = report.actionCards as unknown as ActionCard[];

      await sendReportEmail({
        to:          config.recipients,
        tenantName:  config.tenant.name,
        periodStart: report.periodStart,
        periodEnd:   report.periodEnd,
        narrative:   report.narrative,
        actionCards,
      });

      await prisma.deliveryLog.createMany({
        data: config.recipients.map((recipient) => ({
          tenantId:  config.tenantId,
          reportId:  report.id,
          channel:   "email",
          recipient,
          status:    "SENT",
        })),
      });

      await prisma.report.update({
        where: { id: report.id },
        data:  { status: "SENT" },
      });

      logger.info({ tenantId: config.tenantId, reportId: report.id }, "Informe enviado automáticamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ tenantId: config.tenantId, error: message }, "Error en entrega automática");
    }
  }

  logger.info("Entrega automática completada");
}
