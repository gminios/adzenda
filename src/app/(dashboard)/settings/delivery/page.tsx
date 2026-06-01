import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";
import { GlassCard } from "@/components/ui/glass-card";
import { DeliveryConfigForm } from "@/components/dashboard/delivery-config-form";

export default async function DeliverySettingsPage() {
  const tenant = await resolveActiveTenant();

  if (!tenant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#64748b]">No hay clientes activos.</p>
      </div>
    );
  }

  const config = await prisma.deliveryConfig.findUnique({
    where: { tenantId: tenant.id },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Configuración de entrega</h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          {tenant.name} · configurá cómo se envían los informes
        </p>
      </div>

      <GlassCard hover={false}>
        <DeliveryConfigForm
          tenantId={tenant.id}
          initialConfig={config ? {
            emailEnabled: config.emailEnabled,
            recipients:   config.recipients,
            autoSend:     config.autoSend,
          } : null}
        />
      </GlassCard>
    </div>
  );
}
