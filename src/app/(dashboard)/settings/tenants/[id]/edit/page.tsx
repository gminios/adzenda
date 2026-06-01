import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { TenantForm } from "@/components/dashboard/tenant-form";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/settings/tenants"
          className="mb-4 flex items-center gap-1.5 text-sm text-[#94a3b8] transition hover:text-[#f1f5f9]"
        >
          <ChevronLeft size={15} />
          Volver a clientes
        </Link>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Editar cliente</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">{tenant.name}</p>
      </div>
      <GlassCard hover={false}>
        <TenantForm
          initialData={{
            ...tenant,
            targetRoas: tenant.targetRoas ? Number(tenant.targetRoas) : null,
            targetCpa:  tenant.targetCpa  ? Number(tenant.targetCpa)  : null,
          }}
        />
      </GlassCard>
    </div>
  );
}
