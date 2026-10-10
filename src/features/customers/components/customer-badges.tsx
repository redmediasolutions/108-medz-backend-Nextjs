import { Badge } from "@/components/ui/badge";

import type { Customer } from "../types";

export function CustomerTypeBadge({ customer }: { customer: Pick<Customer, "isAnonymous"> }) {
  return customer.isAnonymous ? <Badge variant="outline">Guest</Badge> : <Badge variant="secondary">Registered</Badge>;
}

export function CustomerRoleBadge({ customer }: { customer: Pick<Customer, "isAdmin"> }) {
  return customer.isAdmin ? <Badge>Admin</Badge> : <span className="text-muted-foreground text-sm">User</span>;
}
