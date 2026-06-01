import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";

type TokenStatus = string;

interface ProblemAccount {
  id: string;
  name: string;
  tokenStatus: TokenStatus;
}

interface Props {
  tenantId: string;
  accounts: ProblemAccount[];
}

export function TokenStatusBanner({ tenantId, accounts }: Props) {
  const hasExpired = accounts.some((a) => a.tokenStatus === "EXPIRED");
  const label = hasExpired ? "Token expirado" : "Token inválido";
  const count = accounts.length;
  const accountsLabel =
    count === 1
      ? `la cuenta "${accounts[0].name}"`
      : `${count} cuentas de Meta`;

  return (
    <div className="border-b border-red-500/30 bg-gradient-to-r from-red-500/15 via-red-500/10 to-amber-500/10 px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20">
            <AlertTriangle size={16} className="text-[#f87171]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#fecaca]">
              {label} en {accountsLabel}
            </p>
            <p className="text-xs text-[#fca5a5]/80">
              La sincronización con Meta Ads no funcionará hasta que actualices el
              token de acceso.
            </p>
          </div>
        </div>
        <Link
          href={`/settings/tenants/${tenantId}/accounts`}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-[#fecaca] transition hover:bg-red-500/25"
        >
          Actualizar token
          <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}
