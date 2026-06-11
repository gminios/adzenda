import { prisma } from "@/lib/db";
import { sendAdminAlertEmail } from "@/lib/delivery/email";
import { logger } from "@/lib/logger";

function adminRecipients(): string[] {
  const raw = process.env.ADMIN_EMAIL ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildHtml(params: {
  tenantName: string;
  accountName: string;
  metaAccountId: string;
  accountId: string;
  tenantId: string;
  errorMessage: string;
  appUrl: string;
}): string {
  const editUrl = `${params.appUrl}/settings/tenants/${params.tenantId}/accounts/${params.accountId}/edit`;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f0b1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <p style="margin:0 0 6px;font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:2px;">
      AdZenda · Alerta
    </p>
    <h1 style="margin:0 0 4px;font-size:20px;color:#f1f5f9;">Token de Meta expirado</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">
      Una cuenta publicitaria dejó de poder sincronizar porque su token de acceso ya no es válido.
    </p>
    <div style="border:1px solid #2d2450;border-radius:8px;background:#1a1333;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;color:#cbd5e1;"><strong>Cliente:</strong> ${params.tenantName}</p>
      <p style="margin:0 0 8px;font-size:12px;color:#cbd5e1;"><strong>Cuenta:</strong> ${params.accountName}</p>
      <p style="margin:0 0 8px;font-size:12px;color:#cbd5e1;"><strong>ID de Meta:</strong> <code style="color:#a78bfa;">${params.metaAccountId}</code></p>
      <p style="margin:0;font-size:12px;color:#94a3b8;"><strong>Detalle:</strong> ${params.errorMessage}</p>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#cbd5e1;">
      Hasta que actualices el token, no se va a poder sincronizar esta cuenta ni generar informes con datos frescos.
    </p>
    <a href="${editUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">
      Actualizar token
    </a>
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2d2450;">
      <span style="font-size:11px;color:#64748b;">AdZenda — Notificación automática</span>
    </div>
  </div>
</body>
</html>`;
}

export async function notifyTokenExpired(params: {
  accountId: string;
  errorMessage: string;
}): Promise<void> {
  const recipients = adminRecipients();
  if (recipients.length === 0) {
    logger.warn("ADMIN_EMAIL no configurado; no se envía alerta de token expirado");
    return;
  }

  const account = await prisma.adAccount.findUnique({
    where: { id: params.accountId },
    select: {
      id: true,
      name: true,
      metaAccountId: true,
      tenantId: true,
      tenant: { select: { name: true } },
    },
  });
  if (!account) return;

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    await sendAdminAlertEmail({
      to: recipients,
      subject: `[AdZenda] Token expirado — ${account.tenant.name} / ${account.name}`,
      bodyHtml: buildHtml({
        tenantName: account.tenant.name,
        accountName: account.name,
        metaAccountId: account.metaAccountId,
        accountId: account.id,
        tenantId: account.tenantId,
        errorMessage: params.errorMessage,
        appUrl,
      }),
    });
    logger.info({ accountId: account.id, recipients }, "Alerta de token expirado enviada");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ accountId: account.id, error: msg }, "Fallo al enviar alerta de token expirado");
  }
}
