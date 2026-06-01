import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { ReportEditor } from "@/components/reports/report-editor";
import { ActionCard } from "@/components/reports/action-card";
import type { ActionCard as ActionCardType } from "@/lib/ai/report-generator";

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { tenant: { select: { name: true } } },
  });

  if (!report || report.status === "SENT") notFound();

  const actionCards = report.actionCards as unknown as ActionCardType[];

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/reports/${report.id}`}
          className="mb-2 flex items-center gap-1.5 text-sm text-[#94a3b8] transition hover:text-[#f1f5f9]"
        >
          <ChevronLeft size={15} /> Volver al informe
        </Link>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Editar informe</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          {report.tenant.name} · {fmt(report.periodStart)} – {fmt(report.periodEnd)}
        </p>
      </div>

      <GlassCard hover={false}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#64748b]">
          Narrativa
        </h2>
        <ReportEditor reportId={report.id} initialNarrative={report.narrative} />
      </GlassCard>

      {/* Action cards — read-only in edit view */}
      {actionCards.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#64748b]">
            Recomendaciones (sólo lectura)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {actionCards.map((card, i) => (
              <ActionCard key={i} card={card} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
