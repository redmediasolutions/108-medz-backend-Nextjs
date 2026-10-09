"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Hourglass, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { prescriptionsService } from "../services/prescriptions.service";

export function ReadyStatusCard({ docId, isReady }: { docId: string; isReady: boolean }) {
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await prescriptionsService.setReady(docId, !isReady);
      toast.success(isReady ? "Marked as not ready" : "Prescription marked ready");
    } catch {
      toast.error("Could not update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={cn(
        "flex-row items-center justify-between gap-4 px-4 py-3",
        isReady ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
      )}
    >
      <div className="flex items-center gap-3">
        {isReady ? <CheckCircle2 className="text-success size-5" /> : <Hourglass className="text-warning size-5" />}
        <div>
          <div className="text-sm font-semibold">{isReady ? "Prescription ready" : "Not ready"}</div>
          <div className="text-muted-foreground text-xs">
            {isReady ? "Customer can see this order is prepared." : "Add medicines, then mark it ready."}
          </div>
        </div>
      </div>
      <Button size="sm" variant={isReady ? "outline" : "default"} onClick={toggle} disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {isReady ? "Mark not ready" : "Mark ready"}
      </Button>
    </Card>
  );
}
