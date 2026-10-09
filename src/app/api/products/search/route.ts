import { NextResponse } from "next/server";

const STORE_BASE_URL = process.env.STORE_BASE_URL ?? "https://janmanstore.in";

/**
 * Proxies WooCommerce custom search used by the Flutter app:
 *   GET {store}/wp-json/my-plugin/v1/backend-search?search=&page=&per_page=20
 * Server-side so the browser never hits CORS.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("per_page") ?? "20";

  if (!search) return NextResponse.json({ data: [] });

  const url = new URL(`${STORE_BASE_URL}/wp-json/my-plugin/v1/backend-search`);
  url.searchParams.set("search", search);
  url.searchParams.set("page", page);
  url.searchParams.set("per_page", perPage);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ data: [], message: "Product search failed" }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json({ data: Array.isArray(json?.data) ? json.data : [] });
  } catch {
    return NextResponse.json({ data: [], message: "Store unreachable" }, { status: 502 });
  }
}
