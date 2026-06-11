/**
 * Job de ingesta diaria.
 * Por cada AdAccount activo: sincroniza jerarquía + últimos 3 días de insights.
 * Si falla una cuenta, loguea el error y continúa con las demás.
 */
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/meta/token";
import { syncHierarchy } from "@/lib/meta/hierarchy";
import { syncInsights } from "@/lib/meta/insights";
import { logger } from "@/lib/logger";
import { notifyTokenExpired } from "@/lib/alerts/token-expired";

type AccountRecord = {
  id: string;
  metaAccountId: string;
  tenantId: string;
  tokenEncrypted: string;
  tokenIv: string;
  tokenAuthTag: string;
  tokenStatus: string;
};

async function ingestAccount(account: AccountRecord): Promise<void> {
  const syncLog = await prisma.syncLog.create({
    data: {
      adAccountId: account.id,
      tenantId: account.tenantId,
      triggeredBy: "cron",
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
    until.setUTCDate(until.getUTCDate() - 1); // ayer
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 3); // hace 3 días

    await syncInsights(
      account.metaAccountId,
      account.id,
      account.tenantId,
      accessToken,
      since,
      until
    );

    await prisma.adAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastSyncStatus: "SUCCESS", tokenStatus: "VALID" },
    });
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "SUCCESS", finishedAt: new Date() },
    });

    logger.info({ adAccountId: account.id }, "Cuenta sincronizada");
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

    logger.error({ adAccountId: account.id, error: message }, "Fallo al sincronizar cuenta");

    if (isTokenError && account.tokenStatus === "VALID") {
      await notifyTokenExpired({ accountId: account.id, errorMessage: message });
    }
  }
}

export async function runIngestion(triggeredBy: "cron" | "manual" = "cron"): Promise<void> {
  logger.info({ triggeredBy }, "Ingesta iniciada");

  const accounts = await prisma.adAccount.findMany({
    where: { active: true, tenant: { active: true } },
    select: {
      id: true, metaAccountId: true, tenantId: true,
      tokenEncrypted: true, tokenIv: true, tokenAuthTag: true,
      tokenStatus: true,
    },
  });

  for (const account of accounts) {
    await ingestAccount(account);
  }

  logger.info({ count: accounts.length, triggeredBy }, "Ingesta finalizada");
}
