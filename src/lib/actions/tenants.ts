"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { tenantSchema } from "@/lib/schemas/tenant";

type ActionOk<T = undefined> = { success: true; data: T };
type ActionErr = { success: false; error: string };
type ActionResult<T = undefined> = ActionOk<T> | ActionErr;

async function requireAuth(): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
}

export async function createTenant(
  formData: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
  } catch {
    return { success: false, error: "No autorizado" };
  }

  const parsed = tenantSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const tenant = await prisma.tenant.create({ data: parsed.data });
    revalidatePath("/settings/tenants");
    return { success: true, data: { id: tenant.id } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("unique")) {
      return { success: false, error: "Ya existe un cliente con ese nombre o slug" };
    }
    return { success: false, error: "Error al crear el cliente" };
  }
}

export async function updateTenant(
  id: string,
  formData: unknown
): Promise<ActionResult> {
  try {
    await requireAuth();
  } catch {
    return { success: false, error: "No autorizado" };
  }

  const parsed = tenantSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await prisma.tenant.update({ where: { id }, data: parsed.data });
    revalidatePath("/settings/tenants");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al actualizar el cliente" };
  }
}

// Returns void — designed for use as a form action in Server Components
export async function toggleTenantActive(
  id: string,
  active: boolean
): Promise<void> {
  const session = await auth();
  if (!session) return;

  await prisma.tenant.update({ where: { id }, data: { active } }).catch(() => null);
  revalidatePath("/settings/tenants");
}
