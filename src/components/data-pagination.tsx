"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES, type PageState } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";

/** 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push("…");
  out.push(count);
  return out;
}

type Props = {
  state: PageState;
  /** total items when known → "Showing 21–40 of 1,284" and numbered pages */
  total?: number | null;
  /** when the total is unknown (cursor / search APIs): is there another page? */
  hasNext?: boolean;
  /** items on the current page (used when total is unknown) */
  pageItemCount?: number;
  /** background fetch of a new page in progress */
  fetching?: boolean;
  itemLabel?: string;
  sizes?: readonly number[];
  compact?: boolean;
  className?: string;
};

/** Shared pagination bar for every list (server- or client-paginated). */
export function DataPagination({
  state,
  total,
  hasNext,
  pageItemCount,
  fetching,
  itemLabel = "items",
  sizes = PAGE_SIZES,
  compact,
  className,
}: Props) {
  const { page, pageSize, setPage, setPageSize } = state;
  const known = typeof total === "number";
  const pageCount = known ? Math.max(1, Math.ceil(total! / pageSize)) : null;
  const canNext = known ? page < pageCount! : Boolean(hasNext);
  const canPrev = page > 1;
  if (known && total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = known ? Math.min(page * pageSize, total!) : (page - 1) * pageSize + (pageItemCount ?? pageSize);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        {fetching && <Loader2 className="size-3.5 animate-spin" />}
        <span>
          {to >= from ? (
            <>
              Showing {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")}
              {known && <> of {total!.toLocaleString("en-IN")}</>} {itemLabel}
            </>
          ) : (
            <>No {itemLabel}</>
          )}
        </span>
        {!compact && (
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger size="sm" className="ml-1 h-7 w-[108px] text-xs" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {(canPrev || canNext) && (
        <div className="flex items-center gap-1">
          {known && !compact && (
            <Button variant="outline" size="icon" className="size-8" disabled={!canPrev} onClick={() => setPage(1)} aria-label="First page">
              <ChevronsLeft />
            </Button>
          )}
          <Button variant="outline" size="icon" className="size-8" disabled={!canPrev} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          {known && !compact ? (
            <div className="hidden items-center gap-1 sm:flex">
              {pageWindow(page, pageCount!).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="text-muted-foreground px-1 text-xs">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "ghost"}
                    size="icon"
                    className="size-8 text-xs tabular-nums"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </Button>
                )
              )}
            </div>
          ) : null}
          <span className={cn("text-muted-foreground px-2 text-xs tabular-nums", known && !compact && "sm:hidden")}>
            Page {page}
            {known && <> of {pageCount}</>}
          </span>
          <Button variant="outline" size="icon" className="size-8" disabled={!canNext} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight />
          </Button>
          {known && !compact && (
            <Button variant="outline" size="icon" className="size-8" disabled={!canNext} onClick={() => setPage(pageCount!)} aria-label="Last page">
              <ChevronsRight />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
