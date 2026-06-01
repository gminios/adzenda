import Link from "next/link";
import {
  Plus, Edit2, ToggleLeft, ToggleRight, Building2,
  Users, Wifi, WifiOff, CircleMinus,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { toggleTenantActive } from "@/lib/actions/tenants";
import { formatRelativeDate } from "@/lib/utils";

type AccountRow = { tokenStatus: string; lastSyncAt: Date | null };
type ConnectionStatus = "connected" | "expired" | "invalid" | "none";

function getConnectionStatus(accounts: AccountRow[]): ConnectionStatus {
  if (accounts.length === 0) return "none";
  if (accounts.some((a) => a.tokenStatus === "VALID")) return "connected";
  if (accounts.some((a) => a.tokenStatus === "EXPIRED")) return "expired";
  return "invalid";
}

function getLastSync(accounts: AccountRow[]): Date | null {
  const dates = accounts.map((a) => a.lastSyncAt).filter(Boolean) as Date[];
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string; icon: React.ElementType }> = {
  connected: { label: "Conectado", color: "text-[#34d399]", icon: Wifi },
  expired:   { label: "Token expirado", color: "text-[#f87171]", icon: WifiOff },
  invalid:   { label: "Token inválido", color: "text-[#fbbf24]", icon: WifiOff },
  none:      { label: "Sin conectar", color: "text-[#64748b]", icon: CircleMinus },
};

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      adAccounts: {
        where: { active: true },
        select: { tokenStatus: true, lastSyncAt: true },
      },
    },
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.active).length,
    connected: tenants.filter((t) => getConnectionStatus(t.adAccounts) === "connected").length,
    issues: tenants.filter((t) => {
      const s = getConnectionStatus(t.adAccounts);
      return s === "expired" || s === "invalid";
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Clientes</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Gestión de cuentas y conexión con Meta Ads
          </p>
        </div>
        <Link
          href="/settings/tenants/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90"
        >
          <Plus size={15} />
          Nuevo cliente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard hover={false} delay={0} className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
            <Users size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#94a3b8]">Clientes totales</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{stats.total}</p>
          </div>
        </GlassCard>

        <GlassCard hover={false} delay={0.1} className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Wifi size={18} className="text-[#34d399]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#94a3b8]">Conectados a Meta</p>
            <p className="text-2xl font-bold text-[#34d399]">{stats.connected}</p>
          </div>
        </GlassCard>

        <GlassCard hover={false} delay={0.2} className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <WifiOff size={18} className="text-[#f87171]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#94a3b8]">Tokens con problemas</p>
            <p className="text-2xl font-bold text-[#f87171]">{stats.issues}</p>
          </div>
        </GlassCard>
      </div>

      {/* Table */}
      <GlassCard hover={false} delay={0.3}>
        {tenants.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#64748b]">
            No hay clientes registrados.{" "}
            <Link href="/settings/tenants/new" className="text-indigo-400 underline underline-offset-2">
              Creá el primero.
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  {["Nombre", "Contacto", "Conexión Meta", "Última sync", "Estado", ""].map((h) => (
                    <th key={h} className="pb-3 pr-4 last:pr-0 font-medium text-[#94a3b8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const connStatus = getConnectionStatus(tenant.adAccounts);
                  const { label, color, icon: StatusIcon } = statusConfig[connStatus];
                  const lastSync = getLastSync(tenant.adAccounts);
                  const toggleAction = toggleTenantActive.bind(null, tenant.id, !tenant.active);

                  return (
                    <tr
                      key={tenant.id}
                      className="border-b border-white/[0.05] last:border-0 even:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[#f1f5f9]">{tenant.name}</div>
                        <div className="font-mono text-xs text-[#64748b]">{tenant.slug}</div>
                      </td>
                      <td className="py-3 pr-4 text-[#94a3b8]">
                        <div>{tenant.contactName ?? "—"}</div>
                        {tenant.contactEmail && (
                          <div className="text-xs text-[#64748b]">{tenant.contactEmail}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`flex items-center gap-1.5 ${color}`}>
                          <StatusIcon size={13} />
                          <span className="text-xs">{label}</span>
                        </span>
                        {tenant.adAccounts.length > 0 && (
                          <span className="mt-0.5 block text-xs text-[#64748b]">
                            {tenant.adAccounts.length} cuenta{tenant.adAccounts.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#94a3b8]">
                        {formatRelativeDate(lastSync)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            tenant.active
                              ? "bg-emerald-500/10 text-[#34d399]"
                              : "bg-red-500/10 text-[#f87171]"
                          }`}
                        >
                          {tenant.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/settings/tenants/${tenant.id}/accounts`}
                            className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                            title="Cuentas de Meta"
                          >
                            <Building2 size={14} />
                          </Link>
                          <Link
                            href={`/settings/tenants/${tenant.id}/edit`}
                            className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </Link>
                          <form action={toggleAction}>
                            <button
                              type="submit"
                              className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                              title={tenant.active ? "Desactivar" : "Activar"}
                            >
                              {tenant.active ? (
                                <ToggleRight size={14} className="text-[#34d399]" />
                              ) : (
                                <ToggleLeft size={14} />
                              )}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
