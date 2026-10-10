"use client";

import * as React from "react";
import { Pill } from "lucide-react";

import { cn } from "@/lib/utils";

export function ProductThumb({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
        className
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Pill className="size-1/2 opacity-60" />
      )}
    </div>
  );
}
