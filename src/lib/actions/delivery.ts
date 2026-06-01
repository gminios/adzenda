"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendReportEmail } from "@/lib/delivery/email";
import { logger } from "@/lib/logger";
import type { ActionCard } from "@/lib/ai/report-generator";

type ActionResult = { success: true } | { success: false; error: string };

const configSchema = z.object({
  tenantId:     z.string().uuid(),
  emailEnabled: z.boolean(),
  recipients:   z.array(z.string().email("Email inválido")).min(1, "Ingresá al menos un destinatario"),
  autoSend:     z.boolean(),
});

export async function upsertDeliveryConfig(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  const parsed = configSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { tenantId, emailEnabled, recipients, autoSend } = parsed.data;

  await prisma.deliveryConfig.upsert({
    where:  { tenantId },
    create: { tenantId, emailEnabled, recipients, autoSend },
    update: { emailEnabled, recipients, autoSend },
  });

  revalidatePath("/settings/delivery");
  return { success: true };
}

export async function sendReportManually(
  reportId: string,
  recipients: string[]
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  if (!recipients.length) return { success: false, error: "Ingresá al menos un destinatario" };

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { tenant: { select: { name: true } } },
  });
  if (!report) return { success: false, error: "Informe no encontrado" };

  const actionCards = report.actionCards as unknown as ActionCard[];

  try {
    await sendReportEmail({
      to:          recipients,
      tenantName:  report.tenant.name,
      periodStart: report.periodStart,
      periodEnd:   report.periodEnd,
      narrative:   report.narrative,
      actionCards,
    });

    // Log each recipient
    await prisma.deliveryLog.createMany({
      data: recipients.map((recipient) => ({
        tenantId:  report.tenantId,
        reportId:  report.id,
        channel:   "email",
        recipient,
        status:    "SENT",
      })),
    });

    await prisma.report.update({
      where: { id: reportId },
      data:  { status: "SENT" },
    });

    revalidatePath(`/reports/${reportId}`);
    revalidatePath("/reports");
    logger.info({ reportId, recipients }, "Informe enviado manualmente");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.deliveryLog.createMany({
      data: recipients.map((recipient) => ({
        tenantId:     report.tenantId,
        reportId:     report.id,
        channel:      "email",
        recipient,
        status:       "FAILED",
        errorMessage: message,
      })),
    });

    logger.error({ reportId, error: message }, "Error enviando informe");
    return { success: false, error: message };
  }
}
