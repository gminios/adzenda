"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/meta/token";
import { syncHierarchy } from "@/lib/meta/hierarchy";
import { syncInsights } from "@/lib/meta/insights";
import { logger } from "@/lib/logger";
import { notifyTokenExpired } from "@/lib/alerts/token-expired";

type ActionResult = { success: true } | { success: false; error: string };

function friendlyMetaError(raw: string): string {
  const codeMatch = raw.match(/Meta API error (\d+)/);
  const code = codeMatch ? Number(codeMatch[1]) : null;

  if (code === 190 || code === 102 || /token|oauth/i.test(raw)) {
    return "El token de Meta expiró. Actualizalo en Editar cuenta.";
  }
  if (code === 200 || /permission/i.test(raw)) {
    return "El token no tiene permisos para esta cuenta de Meta.";
  }
  if (code === 17 || code === 4 || code === 32 || code === 613 || code === 80004 || /rate.?limit|throttl/i.test(raw)) {
    return "Meta está limitando las consultas. Volvé a intentar en unos minutos.";
  }
  if (code === 100) {
    return "Meta no encontró la cuenta o el campo solicitado.";
  }
  if (/fetch failed|ETIMEDOUT|ECONNRESET|ENOTFOUND|network/i.test(raw)) {
    return "No se pudo conectar con Meta. Verificá la conexión e intentá de nuevo.";
  }
  return "Hubo un error al sincronizar con Meta. Revisá el log de actividad.";
}

export async function triggerAccountSync(accountId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };

  const account = await prisma.adAccount.findUnique({
    where: { id: accountId, active: true },
    select: {
      id: true, metaAccountId: true, tenantId: true,
      tokenEncrypted: true, tokenIv: true, tokenAuthTag: true,
      tokenStatus: true,
    },
  });
  if (!account) return { success: false, error: "Cuenta no encontrada" };

  const syncLog = await prisma.syncLog.create({
    data: {
      adAccountId: account.id,
      tenantId: account.tenantId,
      triggeredBy: "manual",
      status: "RUNNING",
    },
  });

  try {
    const accessToken = decryptToken(
      account.tokenEncrypted,
      account.tokenIv,
      account.tokenAuthTag
    );

    await syncHierarchy(account.id, account.metaAccountId, account.tenantId, accessToken);

    const until = new Date();
    until.setUTCDate(until.getUTCDate() - 1);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 3);

    await syncInsights(
      account.metaAccountId, account.id, account.tenantId,
      accessToken, since, until
    );

    await prisma.adAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastSyncStatus: "SUCCESS", tokenStatus: "VALID" },
    });
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "SUCCESS", finishedAt: new Date() },
    });

    revalidatePath(`/settings/tenants/${account.tenantId}/accounts`);
    logger.info({ accountId }, "Sync manual completado");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isTokenError = /error (190|102)|token/i.test(message);

    await prisma.adAccount.update({
      where: { id: account.id },
      data: {
        lastSyncStatus: "FAILED",
        ...(isTokenError && { tokenStatus: "EXPIRED" }),
      },
    });
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: message },
    });

    logger.error({ accountId, error: message }, "Sync manual falló");

    if (isTokenError && account.tokenStatus === "VALID") {
      await notifyTokenExpired({ accountId: account.id, errorMessage: message });
    }

    return { success: false, error: friendlyMetaError(message) };
  }
}
