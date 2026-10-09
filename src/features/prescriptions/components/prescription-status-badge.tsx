import { CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { statusLabel } from "../lib/prescription-utils";

export function PrescriptionStatusBadge({ isReady }: { isReady: boolean }) {
  return (
    <Badge variant={isReady ? "success" : "warning"}>
      {isReady ? <CheckCircle2 /> : <Clock />}
      {statusLabel(isReady)}
    </Badge>
  );
}
