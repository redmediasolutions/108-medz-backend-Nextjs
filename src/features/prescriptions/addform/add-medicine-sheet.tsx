"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Loader2, PackageSearch, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { useProductSearch } from "../hooks/use-product-search";
import { formatPrice } from "../lib/prescription-utils";
import { prescriptionsService } from "../services/prescriptions.service";
import type { Prescription, ProductSearchResult } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: Prescription;
};

/** Port of AddMedicineDialog (pages/prescriptions/adddialog.dart) — stays open so several medicines can be added. */
export function AddMedicineSheet({ open, onOpenChange, prescription }: Props) {
  const [query, setQuery] = React.useState("");
  const [adding, setAdding] = React.useState<number | null>(null);
  const { results, loading, error, hasMore, loadMore, searched } = useProductSearch(query);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const addedIds = React.useMemo(() => new Set(prescription.items.map((i) => i.productId)), [prescription.items]);

  async function add(product: ProductSearchResult) {
    setAdding(product.id);
    try {
      await prescriptionsService.addMedicine(prescription, product);
      toast.success(`Added ${product.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add medicine");
    } finally {
      setAdding(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Add medicine</SheetTitle>
          <SheetDescription>Search the store catalogue and add to this prescription.</SheetDescription>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine name or salt"
              className="pl-9"
            />
            {loading && (
              <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!searched ? (
            <EmptyState icon={PackageSearch} title="Search medicines" description="Type at least 2 characters." />
          ) : error ? (
            <EmptyState title="Search failed" description={error} />
          ) : loading && results.length === 0 ? (
            <div className="grid gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No medicines found" description="Try another spelling or the salt name." />
          ) : (
            <ul className="divide-y">
              {results.map((product) => {
                const added = addedIds.has(product.id);
                const price = formatPrice(product.salePrice) ?? formatPrice(product.price);
                return (
                  <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="bg-muted size-11 shrink-0 overflow-hidden rounded-md border">
                      {product.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image} alt="" className="size-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{product.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {product.salt || `Product ID: ${product.id}`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        #{product.id}
                        {price && <> · {price}</>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={added ? "secondary" : "outline"}
                      disabled={added || adding !== null}
                      onClick={() => add(product)}
                    >
                      {adding === product.id ? (
                        <Loader2 className="animate-spin" />
                      ) : added ? (
                        <Check />
                      ) : (
                        <Plus />
                      )}
                      {added ? "Added" : "Add"}
                    </Button>
                  </li>
                );
              })}
              {hasMore && (
                <li className="p-3">
                  <Button variant="ghost" className="w-full" onClick={loadMore} disabled={loading}>
                    {loading && <Loader2 className="animate-spin" />} Load more
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
