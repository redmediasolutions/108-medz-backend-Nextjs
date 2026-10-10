import { productsRepository as repo } from "../repository/products.repository";
import type { Product } from "../types";

export const productsService = {
  search: (q: string, page = 1): Promise<Product[]> => repo.search(q.trim(), page),
};
