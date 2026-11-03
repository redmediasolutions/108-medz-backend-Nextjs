import { NextResponse } from "next/server";

import { wooConfigured, wooGet } from "@/lib/server/woo";

const STORE_BASE_URL = process.env.STORE_BASE_URL ?? "https://janmanstore.in";

type Raw = Record<string, unknown>;

/**
 * Proxies WooCommerce custom search used by the Flutter app:
 *   GET {store}/wp-json/my-plugin/v1/backend-search?search=&page=&per_page=20
 * Server-side so the browser never hits CORS.
 *
 * Product ID search: a number like "8761" or "#8761" also looks up that product ID and shows it
 * first, followed by normal name matches (numbers like "650" are still searched as names).
 */
async function backendSearch(search: string, page: string, perPage: string): Promise<Raw[]> {
  const url = new URL(`${STORE_BASE_URL}/wp-json/my-plugin/v1/backend-search`);
  url.searchParams.set("search", search);
  url.searchParams.set("page", page);
  url.searchParams.set("per_page", perPage);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw Object.assign(new Error("Product search failed"), { status: res.status });
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

/** One product by ID, in the same shape backend-search returns (incl. salt / packing). */
async function productById(id: number): Promise<Raw | null> {
  if (!wooConfigured()) return null;
  try {
    const { data: p } = await wooGet<Raw>(`products/${id}`, {
      _fields: "id,name,status,price,regular_price,sale_price,images,meta_data",
    });
    if (!p || p.status !== "publish") return null;
    // Same record as the normal search gives, when the plugin returns it for the name
    const byName = await backendSearch(String(p.name ?? ""), "1", "20").catch(() => []);
    const exact = byName.find((r) => Number(r.id) === id);
    if (exact) return exact;
    const meta = Array.isArray(p.meta_data) ? (p.meta_data as { key: string; value: unknown }[]) : [];
    const metaVal = (k: string) => {
      const v = meta.find((m) => m.key === k || m.key === `_${k}`)?.value;
      return typeof v === "string" ? v : "";
    };
    const images = Array.isArray(p.images) ? (p.images as { src?: string }[]) : [];
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      regular_price: p.regular_price,
      sale_price: p.sale_price,
      salt_composition: metaVal("salt_composition"),
      product_content: metaVal("product_content"),
      image: images[0]?.src ?? "",
    };
  } catch {
    return null; // not found / no access → just show name results
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("per_page") ?? "20";

  if (!search) return NextResponse.json({ data: [] });

  const idMatch = /^#?\s*(\d{1,8})$/.exec(search);
  const id = idMatch ? Number(idMatch[1]) : 0;

  try {
    const [byId, results] = await Promise.all([
      id && page === "1" ? productById(id) : Promise.resolve(null),
      backendSearch(idMatch ? idMatch[1] : search, page, perPage).catch((e) => {
        if (id) return [] as Raw[]; // ID lookup may still succeed
        throw e;
      }),
    ]);
    const data = byId ? [byId, ...results.filter((r) => Number(r.id) !== id)] : results;
    return NextResponse.json({ data });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 502;
    return NextResponse.json({ data: [], message: status === 502 ? "Store unreachable" : "Product search failed" }, { status });
  }
}
