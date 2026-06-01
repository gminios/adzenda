"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE = "activeTenantId";

export async function getActiveTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE)?.value ?? null;
}

export async function setActiveTenantId(tenantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, tenantId, {
    httpOnly: false, // needs to be readable client-side for the selector
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

/** Returns the active tenant, or the first active tenant if none selected. */
export async function resolveActiveTenant() {
  const selectedId = await getActiveTenantId();

  if (selectedId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: selectedId, active: true },
      select: { id: true, name: true, slug: true, targetRoas: true, targetCpa: true },
    });
    if (tenant) return tenant;
  }

  // Fallback: first active tenant
  return prisma.tenant.findFirst({
    where: { active: true },
    select: { id: true, name: true, slug: true, targetRoas: true, targetCpa: true },
    orderBy: { name: "asc" },
  });
}
