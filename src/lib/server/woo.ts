// Server-only: import from route handlers (app/api/**) only — never from client components.

/**
 * Server-only WooCommerce REST v3 client. Keys never reach the browser.
 * Env: STORE_BASE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET
 */
const BASE = (process.env.STORE_BASE_URL ?? "https://janmanstore.in").replace(/\/$/, "");

export class WooError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function wooConfigured() {
  return Boolean(process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET);
}

export async function wooGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined | null> = {}
): Promise<{ data: T; total: number; totalPages: number }> {
  if (!wooConfigured()) {
    throw new WooError("WooCommerce keys are not set (WC_CONSUMER_KEY / WC_CONSUMER_SECRET in .env.local)", 500);
  }
  const url = new URL(`${BASE}/wp-json/wc/v3/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const auth = Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new WooError("Could not reach the WooCommerce store", 502);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && (body.message as string)) || `WooCommerce error (${res.status})`;
    throw new WooError(msg, res.status);
  }
  return {
    data: body as T,
    total: Number(res.headers.get("x-wp-total") ?? 0),
    totalPages: Number(res.headers.get("x-wp-totalpages") ?? 0),
  };
}
