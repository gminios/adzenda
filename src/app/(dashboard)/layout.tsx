import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TenantSelector } from "@/components/dashboard/tenant-selector";
import { TokenStatusBanner } from "@/components/dashboard/token-status-banner";
import { prisma } from "@/lib/db";
import { resolveActiveTenant } from "@/lib/active-tenant";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [tenants, activeTenant] = await Promise.all([
    prisma.tenant.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    resolveActiveTenant(),
  ]);

  const problemAccounts = activeTenant
    ? await prisma.adAccount.findMany({
        where: {
          tenantId: activeTenant.id,
          active: true,
          tokenStatus: { not: "VALID" },
        },
        select: { id: true, name: true, tokenStatus: true },
      })
    : [];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0b1e] via-[#1a1333] to-[#0d1b2a]">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <Sidebar />

      <div className="relative z-10 ml-60 flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#0f0b1e]/80 px-6 backdrop-blur-xl">
          <p className="text-sm text-[#64748b]">
            {session.user?.email ?? "Admin"}
          </p>
          <TenantSelector tenants={tenants} activeTenantId={activeTenant?.id ?? null} />
        </header>

        {activeTenant && problemAccounts.length > 0 && (
          <TokenStatusBanner tenantId={activeTenant.id} accounts={problemAccounts} />
        )}

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
