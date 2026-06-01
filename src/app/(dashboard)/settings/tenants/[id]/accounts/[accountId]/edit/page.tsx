import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { EditAdAccountForm } from "@/components/dashboard/ad-account-form";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string; accountId: string }>;
}) {
  const { id: tenantId, accountId } = await params;

  const account = await prisma.adAccount.findUnique({
    where: { id: accountId, tenantId },
    select: { id: true, name: true, metaAccountId: true, tenantId: true },
  });
  if (!account) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/settings/tenants/${tenantId}/accounts`}
          className="mb-2 flex items-center gap-1.5 text-sm text-[#94a3b8] transition hover:text-[#f1f5f9]"
        >
          <ChevronLeft size={15} /> Volver a cuentas
        </Link>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Editar cuenta</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">{account.name}</p>
        <p className="text-xs text-[#64748b]">{account.metaAccountId}</p>
      </div>
      <GlassCard hover={false}>
        <EditAdAccountForm
          accountId={accountId}
          tenantId={tenantId}
          initialName={account.name}
        />
      </GlassCard>
    </div>
  );
}
