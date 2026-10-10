import { redirect } from "next/navigation";

/** Old Flutter route /search → /products */
export default function SearchRedirect() {
  redirect("/products");
}
