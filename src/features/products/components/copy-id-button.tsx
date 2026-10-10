"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** Copies the product ID — same as tapping a search card in the Flutter app. */
export function CopyIdButton({ id, className }: { id: number | string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(id));
      setCopied(true);
      toast.success(`${id} copied to clipboard`, { duration: 1200 });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy product ID"
      className={cn(
        "bg-muted hover:bg-accent text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-medium transition-colors",
        className
      )}
    >
      #{id}
      {copied ? <Check className="text-success size-3" /> : <Copy className="text-muted-foreground size-3" />}
    </button>
  );
}
