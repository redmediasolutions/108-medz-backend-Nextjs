import { api } from "@/lib/api";

import { mapProduct } from "../lib/product-mapper";
import { PRODUCTS_PAGE_SIZE, type Product } from "../types";

/** WooCommerce custom search (janmanstore.in) via our /api/products/search proxy. */
export const productsRepository = {
  async search(search: string, page = 1, perPage = PRODUCTS_PAGE_SIZE): Promise<Product[]> {
    const params = new URLSearchParams({ search, page: String(page), per_page: String(perPage) });
    const res = await api.get<{ data: Record<string, unknown>[] }>(`/api/products/search?${params}`);
    return (res.data ?? []).map(mapProduct);
  },
};
