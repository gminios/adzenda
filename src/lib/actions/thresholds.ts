"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { thresholdSchema } from "@/lib/schemas/threshold";

type ActionResult = { success: true } | { success: false; error: string };

export async function upsertThreshold(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  const parsed = thresholdSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { metric, lowerBound, upperBound, tenantId } = parsed.data;

  await prisma.benchmarkThreshold.upsert({
    where: { tenantId_metric: { tenantId, metric } },
    create: { metric, lowerBound, upperBound, tenantId },
    update: { lowerBound, upperBound },
  });

  revalidatePath("/settings/thresholds");
  return { success: true };
}

export async function resetThreshold(tenantId: string, metric: string): Promise<void> {
  const session = await auth();
  if (!session) return;

  await prisma.benchmarkThreshold.deleteMany({ where: { tenantId, metric } });
  revalidatePath("/settings/thresholds");
}
