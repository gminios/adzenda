"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { encryptToken, decryptToken } from "@/lib/meta/token";
import { validateMetaAdAccount } from "@/lib/meta/client";
import { createAdAccountSchema, updateAdAccountSchema } from "@/lib/schemas/ad-account";

type ActionOk<T = undefined> = { success: true; data: T };
type ActionErr = { success: false; error: string };
type ActionResult<T = undefined> = ActionOk<T> | ActionErr;

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
}

export async function createAdAccount(
  tenantId: string,
  formData: unknown
): Promise<ActionResult<{ id: string }>> {
  try { await requireAuth(); } catch { return { success: false, error: "No autorizado" }; }

  const parsed = createAdAccountSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { metaAccountId, accessToken } = parsed.data;

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { success: false, error: "Cliente no encontrado" };

  // Validate with Meta API
  const validation = await validateMetaAdAccount(accessToken, metaAccountId);
  if (!validation.valid) return { success: false, error: `Meta API: ${validation.error}` };

  const { encrypted, iv, authTag } = encryptToken(accessToken);

  try {
    const account = await prisma.adAccount.create({
      data: {
        tenantId,
        metaAccountId: validation.account.id,
        name: validation.account.name,
        currency: validation.account.currency,
        tokenEncrypted: encrypted,
        tokenIv: iv,
        tokenAuthTag: authTag,
        tokenStatus: "VALID",
      },
    });
    revalidatePath(`/settings/tenants/${tenantId}/accounts`);
    return { success: true, data: { id: account.id } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("unique")) {
      return { success: false, error: "Esta cuenta de Meta ya está registrada para este cliente" };
    }
    return { success: false, error: "Error al guardar la cuenta" };
  }
}

export async function updateAdAccount(
  accountId: string,
  tenantId: string,
  formData: unknown
): Promise<ActionResult> {
  try { await requireAuth(); } catch { return { success: false, error: "No autorizado" }; }

  const parsed = updateAdAccountSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { name, newAccessToken } = parsed.data;
  const updateData: Record<string, unknown> = { name };

  if (newAccessToken) {
    // Validate new token with Meta API
    const account = await prisma.adAccount.findUnique({ where: { id: accountId } });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    const validation = await validateMetaAdAccount(newAccessToken, account.metaAccountId);
    if (!validation.valid) return { success: false, error: `Meta API: ${validation.error}` };

    const { encrypted, iv, authTag } = encryptToken(newAccessToken);
    updateData.tokenEncrypted = encrypted;
    updateData.tokenIv = iv;
    updateData.tokenAuthTag = authTag;
    updateData.tokenStatus = "VALID";
  }

  try {
    await prisma.adAccount.update({ where: { id: accountId }, data: updateData });
    revalidatePath(`/settings/tenants/${tenantId}/accounts`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al actualizar la cuenta" };
  }
}

export async function toggleAdAccountActive(
  accountId: string,
  tenantId: string,
  active: boolean
): Promise<void> {
  const session = await auth();
  if (!session) return;
  await prisma.adAccount.update({ where: { id: accountId }, data: { active } }).catch(() => null);
  revalidatePath(`/settings/tenants/${tenantId}/accounts`);
}

export async function getDecryptedToken(accountId: string): Promise<string | null> {
  const session = await auth();
  if (!session) return null;
  const account = await prisma.adAccount.findUnique({
    where: { id: accountId },
    select: { tokenEncrypted: true, tokenIv: true, tokenAuthTag: true },
  });
  if (!account) return null;
  try {
    return decryptToken(account.tokenEncrypted, account.tokenIv, account.tokenAuthTag);
  } catch {
    return null;
  }
}
