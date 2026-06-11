import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { ActionCard } from "@/lib/ai/report-generator";

const sesClient = new SESv2Client({ region: process.env.AWS_SES_REGION ?? "us-east-1" });
const FROM = process.env.AWS_SES_FROM_EMAIL ?? "noreply@adzenda.com";

function buildHtml(params: {
  tenantName: string;
  periodStart: Date;
  periodEnd: Date;
  narrative: string;
  actionCards: ActionCard[];
}): string {
  const { tenantName, periodStart, periodEnd, narrative, actionCards } = params;

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  const paragraphsHtml = narrative
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.8;color:#cbd5e1;">${p}</p>`)
    .join("");

  const PRIORITY_COLOR: Record<string, string> = {
    alta: "#f87171", media: "#fbbf24", baja: "#34d399",
  };
  const PRIORITY_LABEL: Record<string, string> = {
    alta: "Alta", media: "Media", baja: "Baja",
  };

  const cardsHtml = actionCards
    .map(
      (card) => `
      <div style="flex:1;border:1px solid #2d2450;border-radius:8px;background:#1a1333;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <strong style="color:#f1f5f9;font-size:13px;">${card.title}</strong>
          <span style="font-size:11px;font-weight:700;color:${PRIORITY_COLOR[card.priority] ?? "#94a3b8"};">
            ${PRIORITY_LABEL[card.priority] ?? card.priority}
          </span>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0 0 10px;line-height:1.6;">${card.description}</p>
        <div style="background:#0f0b1e;border-radius:6px;padding:10px;">
          <span style="color:#64748b;font-size:11px;">Acción: </span>
          <span style="color:#f1f5f9;font-size:12px;">${card.action}</span>
        </div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0b1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="border-bottom:1px solid #2d2450;padding-bottom:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:10px;color:#a78bfa;text-transform:uppercase;letter-spacing:2px;">
        AdZenda · Informe de publicidad
      </p>
      <h1 style="margin:0 0 4px;font-size:22px;color:#f1f5f9;">${tenantName}</h1>
      <p style="margin:0;font-size:13px;color:#94a3b8;">${fmt(periodStart)} – ${fmt(periodEnd)}</p>
    </div>

    <!-- Narrative -->
    <p style="margin:0 0 12px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;">
      Resumen ejecutivo
    </p>
    ${paragraphsHtml}

    <!-- Action Cards -->
    ${
      actionCards.length > 0
        ? `<p style="margin:24px 0 12px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;">
        Recomendaciones
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${cardsHtml}
      </div>`
        : ""
    }

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2d2450;display:flex;justify-content:space-between;">
      <span style="font-size:11px;color:#64748b;">AdZenda — Informe confidencial</span>
      <span style="font-size:11px;color:#64748b;">${new Date().toLocaleDateString("es-AR")}</span>
    </div>
  </div>
</body>
</html>`;
}

export interface SendEmailParams {
  to: string[];
  tenantName: string;
  periodStart: Date;
  periodEnd: Date;
  narrative: string;
  actionCards: ActionCard[];
}

export async function sendAdminAlertEmail(params: {
  to: string[];
  subject: string;
  bodyHtml: string;
}): Promise<void> {
  const command = new SendEmailCommand({
    FromEmailAddress: FROM,
    Destination: { ToAddresses: params.to },
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: { Html: { Data: params.bodyHtml, Charset: "UTF-8" } },
      },
    },
  });
  await sesClient.send(command);
}

export async function sendReportEmail(params: SendEmailParams): Promise<void> {
  const { to, tenantName, periodStart, periodEnd, narrative, actionCards } = params;

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const subject = `Informe semanal ${tenantName} — ${fmt(periodStart)} al ${fmt(periodEnd)}`;
  const html    = buildHtml({ tenantName, periodStart, periodEnd, narrative, actionCards });

  const command = new SendEmailCommand({
    FromEmailAddress: FROM,
    Destination: { ToAddresses: to },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body:    { Html: { Data: html, Charset: "UTF-8" } },
      },
    },
  });

  await sesClient.send(command);
}
