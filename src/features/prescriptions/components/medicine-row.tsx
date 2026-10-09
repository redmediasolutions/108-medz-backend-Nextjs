"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Loader2, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

import { prescriptionsService } from "../services/prescriptions.service";
import type { PrescriptionItem } from "../types";

export function MedicineRow({ item, docId }: { item: PrescriptionItem; docId: string }) {
  const [comment, setComment] = React.useState(item.comment);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Keep in sync with realtime changes made elsewhere (only when not mid-edit).
  const editing = React.useRef(false);
  React.useEffect(() => {
    if (!editing.current) setComment(item.comment);
  }, [item.comment]);

  async function save() {
    editing.current = false;
    const value = comment.trim();
    if (value === item.comment.trim()) return;
    setSaving(true);
    try {
      await prescriptionsService.updateComment(docId, item.productId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      toast.error("Could not save comment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="pl-4 font-medium whitespace-normal">{item.productName || "Unknown product"}</TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs">{item.productId}</TableCell>
      <TableCell className="min-w-56">
        <div className="relative">
          <Input
            value={comment}
            placeholder="Substitute / notes"
            onFocus={() => (editing.current = true)}
            onChange={(e) => setComment(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setComment(item.comment);
                editing.current = false;
                e.currentTarget.blur();
              }
            }}
            className="h-8 pr-8"
          />
          <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
            {saving ? (
              <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
            ) : saved ? (
              <Check className="text-success size-3.5" />
            ) : null}
          </span>
        </div>
      </TableCell>
      <TableCell className="pr-3 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Remove ${item.productName}`}
        >
          <Trash2 />
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Remove medicine"
          description={`Remove "${item.productName}" from this prescription?`}
          confirmLabel="Remove"
          destructive
          onConfirm={async () => {
            try {
              await prescriptionsService.removeMedicine(docId, item.productId);
              toast.success("Medicine removed");
            } catch {
              toast.error("Could not remove medicine");
            }
          }}
        />
      </TableCell>
    </TableRow>
  );
}
