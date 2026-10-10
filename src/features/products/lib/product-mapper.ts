import type { Product } from "../types";

/** Port of SearchModel.fromJson (models/search.dart). */
export function mapProduct(raw: Record<string, unknown>): Product {
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? ""),
    price: String(raw.price ?? "0"),
    regularPrice: String(raw.regular_price ?? "0"),
    salePrice: String(raw.sale_price ?? "0"),
    salt: String(raw.salt_composition ?? ""),
    productContent: String(raw.product_content ?? ""),
    image: typeof raw.image === "string" && raw.image ? raw.image : null,
  };
}
