import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { CreateAdAccountForm } from "@/components/dashboard/ad-account-form";

export default async function NewAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });
  if (!tenant) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/settings/tenants/${tenantId}/accounts`}
          className="mb-2 flex items-center gap-1.5 text-sm text-[#94a3b8] transition hover:text-[#f1f5f9]"
        >
          <ChevronLeft size={15} /> Volver a cuentas
        </Link>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Conectar cuenta de Meta</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">{tenant.name}</p>
      </div>
      <GlassCard hover={false}>
        <CreateAdAccountForm tenantId={tenantId} />
      </GlassCard>
    </div>
  );
}
