"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCsv } from "@/lib/csv";

import { CUSTOMER_CSV_HEADER, customerCsvRow, todayInput } from "../lib/customer-utils";
import { customersService } from "../services/customers.service";

const MAX_EXPORT = 5000;

/** Port of _ExportCustomersDialog — the date range is now actually applied. */
export function ExportCustomersDialog({
  open,
  onOpenChange,
  defaultFrom = "",
  defaultTo = "",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [from, setFrom] = React.useState(defaultFrom);
  const [to, setTo] = React.useState(defaultTo);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setFrom(defaultFrom);
      setTo(defaultTo);
    }
  }, [open, defaultFrom, defaultTo]);

  const invalid = Boolean(from && to && from > to);

  async function exportCsv() {
    setBusy(true);
    try {
      const customers = await customersService.fetchAll({ from, to }, MAX_EXPORT);
      if (customers.length === 0) {
        toast.info("No customers in that range");
        return;
      }
      const suffix = from || to ? `_${from || "start"}_to_${to || "today"}` : "";
      downloadCsv(`customers_export${suffix}.csv`, [CUSTOMER_CSV_HEADER, ...customers.map(customerCsvRow)]);
      toast.success(
        `Exported ${customers.length} customer${customers.length === 1 ? "" : "s"}` +
          (customers.length >= MAX_EXPORT ? ` (limit ${MAX_EXPORT})` : "")
      );
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  }

  const dateClass = "[color-scheme:light] dark:[color-scheme:dark]";

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export customers</DialogTitle>
          <DialogDescription>
            Download a CSV of customers by joining date. Leave both empty to export everyone (up to {MAX_EXPORT}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="exp-from">From</Label>
            <Input id="exp-from" type="date" max={to || todayInput()} value={from} onChange={(e) => setFrom(e.target.value)} className={dateClass} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exp-to">To</Label>
            <Input id="exp-to" type="date" min={from || undefined} max={todayInput()} value={to} onChange={(e) => setTo(e.target.value)} className={dateClass} />
          </div>
        </div>
        {invalid && <p className="text-destructive text-sm">“From” must be before “To”.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={exportCsv} disabled={busy || invalid}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
