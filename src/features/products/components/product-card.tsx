import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";

import { discountPercent, mrp, sellingPrice } from "../lib/product-utils";
import type { Product } from "../types";
import { CopyIdButton } from "./copy-id-button";
import { ProductThumb } from "./product-thumb";

export function ProductCard({ product: p }: { product: Product }) {
  const sell = sellingPrice(p);
  const m = mrp(p);
  const off = discountPercent(p);

  return (
    <div className="bg-card flex gap-4 rounded-xl border p-4 transition-colors hover:border-primary/30">
      <ProductThumb src={p.image} className="size-16" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="leading-snug font-medium">{p.name}</h3>
          <CopyIdButton id={p.id} className="shrink-0" />
        </div>
        {p.salt && <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{p.salt}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          {sell > 0 ? (
            <span className="font-semibold tabular-nums">{formatINR(sell)}</span>
          ) : (
            <span className="text-muted-foreground">No price</span>
          )}
          {off !== null && (
            <>
              <span className="text-muted-foreground tabular-nums line-through">{formatINR(m)}</span>
              <Badge variant="success">{off}% off</Badge>
            </>
          )}
          {p.productContent && (
            <span className="text-muted-foreground border-l pl-3 text-xs">{p.productContent}</span>
          )}
        </div>
      </div>
    </div>
  );
}
