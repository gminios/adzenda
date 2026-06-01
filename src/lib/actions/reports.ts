"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateReportForTenant } from "@/lib/ai/report-generator";
import { logger } from "@/lib/logger";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Last full Mon–Sun week before today */
function lastFullWeek(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const daysToLastSun = day === 0 ? 7 : day;
  const end = new Date(now);
  end.setDate(now.getDate() - daysToLastSun);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return { start, end };
}

export async function generateReport(
  tenantId: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  const { start, end } = lastFullWeek();

  // Check if a report for this period already exists (update version)
  const existing = await prisma.report.findFirst({
    where: { tenantId, periodStart: start, periodEnd: end },
    orderBy: { version: "desc" },
  });

  if (existing && existing.version >= 3) {
    return { success: false, error: "Límite de 3 versiones alcanzado para este período." };
  }

  try {
    const result = await generateReportForTenant(tenantId, start, end);

    let report;
    if (existing) {
      // Regeneration: bump version, keep same period record
      report = await prisma.report.update({
        where: { id: existing.id },
        data: {
          narrative: result.narrative,
          actionCards: result.actionCards as unknown as import("@prisma/client").Prisma.InputJsonValue,
          version: existing.version + 1,
          status: "DRAFT",
          aiModel: result.aiModel,
        },
      });
    } else {
      report = await prisma.report.create({
        data: {
          tenantId,
          periodStart: start,
          periodEnd: end,
          narrative: result.narrative,
          actionCards: result.actionCards as unknown as import("@prisma/client").Prisma.InputJsonValue,
          version: 1,
          status: "DRAFT",
          aiModel: result.aiModel,
        },
      });
    }

    revalidatePath("/reports");
    logger.info({ tenantId, reportId: report.id }, "Informe generado");
    return { success: true, data: { id: report.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ tenantId, error: message }, "Error generando informe");
    return { success: false, error: message };
  }
}

export async function updateReportNarrative(
  reportId: string,
  narrative: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  if (!narrative.trim()) return { success: false, error: "El texto no puede estar vacío." };

  await prisma.report.update({
    where: { id: reportId },
    data: { narrative: narrative.trim(), status: "READY" },
  });

  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/reports");
  return { success: true, data: undefined };
}

export async function markReportReady(reportId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "READY" },
  });

  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/reports");
  return { success: true, data: undefined };
}
