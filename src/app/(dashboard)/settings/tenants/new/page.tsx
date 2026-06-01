import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { TenantForm } from "@/components/dashboard/tenant-form";

export default function NewTenantPage() {
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
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Nuevo cliente</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Registrá un nuevo cliente para conectar sus cuentas de Meta Ads.
        </p>
      </div>
      <GlassCard hover={false}>
        <TenantForm />
      </GlassCard>
    </div>
  );
}
