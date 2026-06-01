const META_API_BASE = "https://graph.facebook.com/v21.0";

export interface MetaAccountInfo {
  id: string;
  name: string;
  currency: string;
}

export async function validateMetaAdAccount(
  accessToken: string,
  adAccountId: string
): Promise<{ valid: true; account: MetaAccountInfo } | { valid: false; error: string }> {
  const normalizedId = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  try {
    const res = await fetch(
      `${META_API_BASE}/${normalizedId}?fields=id,name,currency&access_token=${accessToken}`,
      { cache: "no-store" }
    );
    const data: {
      id?: string;
      name?: string;
      currency?: string;
      error?: { message: string; code: number };
    } = await res.json();

    if (data.error) {
      if (data.error.code === 190) return { valid: false, error: "Token expirado o inválido" };
      return { valid: false, error: data.error.message };
    }

    if (!data.id || !data.name) return { valid: false, error: "Respuesta inesperada de Meta" };

    return {
      valid: true,
      account: {
        id: data.id,
        name: data.name,
        currency: data.currency ?? "ARS",
      },
    };
  } catch {
    return { valid: false, error: "No se pudo conectar con la API de Meta" };
  }
}
