import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateReportPdf } from "@/lib/delivery/pdf";
import type { ActionCard } from "@/lib/ai/report-generator";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new Response("No autorizado", { status: 401 });

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { tenant: { select: { name: true } } },
  });

  if (!report) return new Response("No encontrado", { status: 404 });

  const actionCards = report.actionCards as unknown as ActionCard[];

  const pdfBuffer = await generateReportPdf({
    tenantName:  report.tenant.name,
    periodStart: report.periodStart,
    periodEnd:   report.periodEnd,
    narrative:   report.narrative,
    actionCards,
  });

  const slug = report.tenant.name.toLowerCase().replace(/\s+/g, "-");
  const filename = `informe-${slug}-${report.periodStart.toISOString().slice(0, 10)}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      String(pdfBuffer.length),
    },
  });
}
