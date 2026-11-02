"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Info, RefreshCw, ScanSearch, Search, X } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/pincodes/components/stat-tile";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useSearchHistory } from "../hooks/use-search-data";
import { groupTerms, normalizeTerm } from "../lib/searchdata-utils";
import { SEARCH_LOAD_LIMIT, SEARCH_PRESETS, type SearchPreset } from "../types";
import { RecentSearchesTable } from "./recent-searches-table";
import { TopSearchesTable } from "./top-searches-table";

type View = "top" | "all";

/** Port of pages/searchdata (Flutter) + "Top searches": what app users look for, and who. */
export function SearchdataDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const preset = (SEARCH_PRESETS.some((p) => p.value === sp.get("range")) ? sp.get("range") : "30d") as SearchPreset;
  const view: View = sp.get("view") === "all" ? "all" : "top";

  const [text, setText] = React.useState("");
  const [notFoundOnly, setNotFoundOnly] = React.useState(false);
  const term = normalizeTerm(useDebounce(text, 250));

  const { data, loading, fetching, error, refresh } = useSearchHistory(preset);

  function setParam(k: string, v: string | null) {
    const q = new URLSearchParams(sp);
    if (v === null) q.delete(k);
    else q.set(k, v);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  }

  const entries = React.useMemo(() => {
    const all = data?.entries ?? [];
    return all.filter((e) => (!term || e.key.includes(term)) && (!notFoundOnly || e.found === false));
  }, [data, term, notFoundOnly]);
  const stats = React.useMemo(() => groupTerms(entries), [entries]);

  const all = data?.entries ?? [];
  const people = new Set(all.map((e) => e.userId).filter(Boolean)).size;
  const notFound = all.filter((e) => e.found === false).length;
  const tracksResults = all.some((e) => e.found !== null);
  const newest = all[0]?.time ?? null;
  const staleDays = newest ? Math.floor((Date.now() - newest.getTime()) / 86_400_000) : null;
  const resetKey = [preset, term, notFoundOnly, view];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Search data"
        description="What customers search for in the 108 Medz app — and who searched."
        actions={
          <Button variant="outline" onClick={() => refresh()} disabled={fetching}>
            <RefreshCw className={cn(fetching && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg border p-1 sm:w-fit">
          {SEARCH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setParam("range", p.value === "30d" ? null : p.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                preset === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Searches" value={all.length.toLocaleString("en-IN")} loading={loading} sub={data?.capped ? `latest ${SEARCH_LOAD_LIMIT.toLocaleString("en-IN")} loaded` : undefined} />
        <StatTile label="People searching" value={people.toLocaleString("en-IN")} loading={loading} />
        <StatTile label="Different terms" value={groupTerms(all).length.toLocaleString("en-IN")} loading={loading} />
        <StatTile
          label="No results"
          value={tracksResults ? notFound.toLocaleString("en-IN") : "—"}
          sub={tracksResults ? "click to show only these" : "not recorded by the app in this range"}
          loading={loading}
          tone={notFound ? "text-warning" : undefined}
          onClick={tracksResults ? () => setNotFoundOnly((v) => !v) : undefined}
          active={notFoundOnly}
        />
      </div>

      {staleDays !== null && staleDays >= 3 && (
        <div className="text-muted-foreground mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            The newest search saved is from {formatDate(newest)} ({staleDays} days ago). If customers are still searching in the app, the
            app may have stopped saving searches.
          </span>
        </div>
      )}

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-lg border p-1">
            {(
              [
                ["top", "Top searches"],
                ["all", "All searches"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setParam("view", v === "top" ? null : v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by medicine name" className="pl-9" />
          </div>
          {(text || notFoundOnly) && (
            <Button
              variant="ghost"
              onClick={() => {
                setText("");
                setNotFoundOnly(false);
              }}
            >
              <X /> Clear
            </Button>
          )}
        </div>

        {error ? (
          <EmptyState icon={AlertTriangle} title="Could not load searches" description={(error as Error).message} />
        ) : loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ScanSearch}
            title="No searches found"
            description={text || notFoundOnly ? "Try a different filter." : "No searches were saved in this period. Try a longer range."}
          />
        ) : (
          <div className={cn(fetching && "opacity-60 transition-opacity")}>
            {view === "top" ? <TopSearchesTable stats={stats} resetKey={resetKey} /> : <RecentSearchesTable entries={entries} resetKey={resetKey} />}
          </div>
        )}
      </Card>
    </div>
  );
}
