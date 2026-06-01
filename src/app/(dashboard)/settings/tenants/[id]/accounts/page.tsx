import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Plus, Edit2, ToggleLeft, ToggleRight,
  ChevronLeft, Wifi, WifiOff,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { GlassCard } from "@/components/ui/glass-card";
import { toggleAdAccountActive } from "@/lib/actions/ad-accounts";
import { SyncButton } from "@/components/dashboard/sync-button";
import { formatRelativeDate } from "@/lib/utils";

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      adAccounts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, metaAccountId: true, currency: true,
          tokenStatus: true, active: true, lastSyncAt: true, lastSyncStatus: true,
        },
      },
    },
  });

  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/settings/tenants"
            className="mb-2 flex items-center gap-1.5 text-sm text-[#94a3b8] transition hover:text-[#f1f5f9]"
          >
            <ChevronLeft size={15} /> Volver a clientes
          </Link>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Cuentas de Meta</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">{tenant.name}</p>
        </div>
        <Link
          href={`/settings/tenants/${tenantId}/accounts/new`}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition hover:opacity-90"
        >
          <Plus size={15} /> Conectar cuenta
        </Link>
      </div>

      <GlassCard hover={false}>
        {tenant.adAccounts.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#64748b]">
            No hay cuentas conectadas.{" "}
            <Link
              href={`/settings/tenants/${tenantId}/accounts/new`}
              className="text-indigo-400 underline underline-offset-2"
            >
              Conectá la primera.
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  {["Nombre", "ID Meta", "Moneda", "Token", "Última sync", "Estado", ""].map((h) => (
                    <th key={h} className="pb-3 pr-4 last:pr-0 font-medium text-[#94a3b8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenant.adAccounts.map((account) => {
                  const toggleAction = toggleAdAccountActive.bind(
                    null, account.id, tenantId, !account.active
                  );
                  return (
                    <tr
                      key={account.id}
                      className="border-b border-white/[0.05] last:border-0 even:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-4 font-medium text-[#f1f5f9]">{account.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-[#94a3b8]">
                        {account.metaAccountId}
                      </td>
                      <td className="py-3 pr-4 text-[#94a3b8]">{account.currency}</td>
                      <td className="py-3 pr-4">
                        {account.tokenStatus === "VALID" ? (
                          <span className="flex items-center gap-1.5 text-[#34d399]">
                            <Wifi size={13} /> Válido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[#f87171]">
                            <WifiOff size={13} />
                            {account.tokenStatus === "EXPIRED" ? "Expirado" : "Inválido"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#94a3b8]">
                        <div>{formatRelativeDate(account.lastSyncAt)}</div>
                        {account.lastSyncStatus === "FAILED" && (
                          <div className="text-[#f87171]">Falló</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            account.active
                              ? "bg-emerald-500/10 text-[#34d399]"
                              : "bg-red-500/10 text-[#f87171]"
                          }`}
                        >
                          {account.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <SyncButton accountId={account.id} />
                          <Link
                            href={`/settings/tenants/${tenantId}/accounts/${account.id}/edit`}
                            className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </Link>
                          <form action={toggleAction}>
                            <button
                              type="submit"
                              className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/[0.08] hover:text-[#f1f5f9]"
                              title={account.active ? "Desactivar" : "Activar"}
                            >
                              {account.active ? (
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
