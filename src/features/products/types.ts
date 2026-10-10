/** Product from janmanstore.in /wp-json/my-plugin/v1/backend-search (port of models/search.dart). */
export type Product = {
  id: number;
  name: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  /** salt_composition */
  salt: string;
  /** product_content — packing, e.g. "Strip of 15 tablets" */
  productContent: string;
  image: string | null;
};

export const PRODUCTS_PAGE_SIZE = 20;
