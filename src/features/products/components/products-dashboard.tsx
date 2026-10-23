"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, PackageSearch, Search, X } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUrlPageState } from "@/hooks/use-pagination";

import { useProductSearch } from "../hooks/use-product-search";
import { ProductCard } from "./product-card";

/** Port of pages/searchproducts/searchproducts.dart — search the store catalogue by name or salt. */
export function ProductsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pager = useUrlPageState(20);
  const { results, loading, fetching, error, hasNext, searched, term, pending } = useProductSearch(query, pager.page);

  // Keep ?q= in the URL so searches are shareable / survive reload. A new term starts at page 1.
  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (term === current || (!searched && !current)) return;
    const params = new URLSearchParams(searchParams);
    if (searched) params.set("q", term);
    else params.delete("q");
    params.delete("page");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [term, searched, pathname, router, searchParams]);

  // "/" focuses search
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const busy = fetching || pending;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Products" description="Search the store catalogue by product name or salt composition." />

      <div className="relative mb-4">
        <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Dolo 650 or Paracetamol"
          className="h-11 pr-10 pl-10 text-base"
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {busy && searched ? (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          ) : query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="text-muted-foreground bg-muted hidden rounded border px-1.5 text-[10px] font-medium sm:inline">
              /
            </kbd>
          )}
        </span>
      </div>

      {!searched ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Search the catalogue"
            description="Type at least 2 characters. Click a product ID to copy it."
          />
        </Card>
      ) : error ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Search failed" description={error} />
        </Card>
      ) : loading && results.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 && pager.page === 1 ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title={`No products found for "${term}"`}
            description="Try another spelling or search by salt."
          />
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground mb-3 text-sm">
            Results for <span className="text-foreground font-medium">&ldquo;{term}&rdquo;</span>
          </p>
          <div className={`grid gap-3 transition-opacity ${fetching ? "opacity-60" : ""}`}>
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <DataPagination
            className="mt-4"
            state={pager}
            hasNext={hasNext}
            pageItemCount={results.length}
            fetching={fetching}
            itemLabel="products"
            compact
          />
        </>
      )}
    </div>
  );
}
