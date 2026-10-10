import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { orderStatusTone, titleCase } from "../lib/customer-utils";

const toneClass = {
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", toneClass[orderStatusTone(status)])}>
      {titleCase(status || "pending")}
    </Badge>
  );
}
