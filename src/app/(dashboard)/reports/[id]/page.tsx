import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Edit2, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { ReportViewer } from "@/components/reports/report-viewer";
import { GenerateButton } from "@/components/reports/generate-button";
import { MarkReadyButton } from "@/components/reports/mark-ready-button";
import { SendForm } from "@/components/reports/send-form";
import type { ActionCard } from "@/lib/ai/report-generator";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[#64748b]/20 text-[#94a3b8]",
  READY: "bg-emerald-500/20 text-[#34d399]",
  SENT:  "bg-indigo-500/20 text-indigo-300",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", READY: "Listo", SENT: "Enviado",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      tenant: {
        select: {
          name: true,
          deliveryConfig: { select: { recipients: true } },
        },
      },
      deliveryLogs: {
        orderBy: { sentAt: "desc" },
        take: 10,
        select: { recipient: true, status: true, sentAt: true, channel: true, errorMessage: true },
      },
    },
  });

  if (!report) notFound();

  const actionCards   = report.actionCards as unknown as ActionCard[];
  const defaultEmails = report.tenant.deliveryConfig?.recipients ?? [];

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/reports"
            className="mb-2 flex items-center gap-1.5 text-sm text-[#94a3b8] transition hover:text-[#f1f5f9]"
          >
            <ChevronLeft size={15} /> Volver a informes
          </Link>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">
            {fmt(report.periodStart)} – {fmt(report.periodEnd)}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-[#94a3b8]">{report.tenant.name}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[report.status] ?? STATUS_STYLES.DRAFT}`}>
              {STATUS_LABEL[report.status] ?? report.status}
            </span>
            <span className="text-xs text-[#64748b]">v{report.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PDF download */}
          <a
            href={`/api/reports/${report.id}/pdf`}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
            title="Descargar PDF"
          >
            <Download size={14} /> PDF
          </a>

          {report.status !== "SENT" && (
            <Link
              href={`/reports/${report.id}/edit`}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
            >
              <Edit2 size={14} /> Editar
            </Link>
          )}
          {report.status === "DRAFT" && (
            <MarkReadyButton reportId={report.id} />
          )}
          {report.status !== "SENT" && (
            <GenerateButton
              tenantId={report.tenantId}
              existingReportId={report.id}
              currentVersion={report.version}
            />
          )}
        </div>
      </div>

      {/* Report content */}
      <ReportViewer narrative={report.narrative} actionCards={actionCards} />

      {/* Send section */}
      {report.status !== "SENT" && (
        <GlassCard hover={false}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#64748b]">
            Enviar informe
          </h2>
          <SendForm reportId={report.id} defaultRecipients={defaultEmails} />
        </GlassCard>
      )}

      {/* Delivery log */}
      {report.deliveryLogs.length > 0 && (
        <GlassCard hover={false}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#64748b]">
            Historial de envíos
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Destinatario", "Canal", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium text-[#94a3b8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.deliveryLogs.map((log, i) => (
                <tr key={i} className="border-b border-white/[0.05] last:border-0">
                  <td className="py-2 pr-4 text-[#f1f5f9]">{log.recipient}</td>
                  <td className="py-2 pr-4 text-[#94a3b8] capitalize">{log.channel}</td>
                  <td className="py-2 pr-4">
                    <span className={log.status === "SENT" ? "text-[#34d399]" : "text-[#f87171]"}>
                      {log.status === "SENT" ? "Enviado" : "Falló"}
                    </span>
                    {log.errorMessage && (
                      <span className="ml-2 text-[#f87171]">({log.errorMessage})</span>
                    )}
                  </td>
                  <td className="py-2 text-[#64748b]">
                    {log.sentAt.toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Footer */}
      <p className="text-xs text-[#64748b]">
        Generado el {report.createdAt.toLocaleDateString("es-AR")} · Modelo: {report.aiModel}
      </p>
    </div>
  );
}
