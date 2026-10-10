import { redirect } from "next/navigation";

/** Old Flutter route /customers/:userId/rewards → rewards tab. */
export default async function CustomerRewardsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/customers/${id}?tab=rewards`);
}
