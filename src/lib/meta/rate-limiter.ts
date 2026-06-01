import { logger } from "@/lib/logger";
import type { MetaPagedResponse } from "@/types/meta";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch wrapper con exponential backoff para errores 429 de Meta API.
 * Reintentos: 1s → 2s → 4s (máx 3 intentos).
 */
export async function metaFetch(
  url: string,
  retries = 3,
  delayMs = 1000
): Promise<Response> {
  const res = await fetch(url, { cache: "no-store" });

  if (res.status === 429 && retries > 0) {
    logger.warn({ url, retries, delayMs }, "Meta API rate limit — backoff");
    await sleep(delayMs);
    return metaFetch(url, retries - 1, delayMs * 2);
  }

  return res;
}

/**
 * Recorre todas las páginas de un endpoint paginado de Meta API.
 * Lanza error si la respuesta contiene `error`.
 */
export async function metaGetAllPages<T>(
  firstUrl: string
): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = firstUrl;

  while (nextUrl) {
    const res = await metaFetch(nextUrl);
    const page: MetaPagedResponse<T> = await res.json();

    if (page.error) {
      throw new Error(
        `Meta API error ${page.error.code}: ${page.error.message}`
      );
    }

    items.push(...page.data);
    nextUrl = page.paging?.next;

    if (nextUrl) await sleep(2000);
  }

  return items;
}
