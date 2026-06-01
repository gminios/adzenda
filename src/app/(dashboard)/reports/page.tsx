import Link from "next/link";
import { FileText, Eye, Edit2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";
import { GlassCard } from "@/components/ui/glass-card";
import { GenerateButton } from "@/components/reports/generate-button";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:  "bg-[#64748b]/20 text-[#94a3b8]",
  READY:  "bg-emerald-500/20 text-[#34d399]",
  SENT:   "bg-indigo-500/20 text-indigo-300",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  READY: "Listo",
  SENT:  "Enviado",
};

export default async function ReportsPage() {
  const tenant = await resolveActiveTenant();

  if (!tenant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#64748b]">No hay clientes activos.</p>
      </div>
    );
  }

  const reports = await prisma.report.findMany({
    where: { tenantId: tenant.id },
    orderBy: { periodStart: "desc" },
    select: {
      id: true, periodStart: true, periodEnd: true,
      status: true, version: true, createdAt: true,
    },
  });

  function fmtPeriod(start: Date, end: Date) {
    const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Informes</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">{tenant.name}</p>
        </div>
        <GenerateButton tenantId={tenant.id} />
      </div>

      <GlassCard hover={false}>
        {reports.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="mx-auto mb-3 text-[#64748b]" />
            <p className="text-sm text-[#64748b]">
              No hay informes generados aún.
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              Hacé clic en &ldquo;Generar informe&rdquo; para crear el primero.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  {["Período", "Estado", "Versión", "Generado", ""].map((h) => (
                    <th key={h} className="pb-3 pr-4 last:pr-0 font-medium text-[#94a3b8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-white/[0.05] last:border-0 even:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4 font-medium text-[#f1f5f9]">
                      {fmtPeriod(report.periodStart, report.periodEnd)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[report.status] ?? STATUS_STYLES.DRAFT}`}>
                        {STATUS_LABEL[report.status] ?? report.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[#94a3b8]">v{report.version}</td>
                    <td className="py-3 pr-4 text-xs text-[#94a3b8]">
                      {report.createdAt.toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/reports/${report.id}`}
                          className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                          title="Ver informe"
                        >
                          <Eye size={14} />
                        </Link>
                        {report.status !== "SENT" && (
                          <Link
                            href={`/reports/${report.id}/edit`}
                            className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
