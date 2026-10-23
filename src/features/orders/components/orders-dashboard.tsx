"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Receipt, Search, X } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { paginate, useUrlPageState } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";

import { DEFAULT_ORDER_FILTERS, useAppOrders, useWooByIds, useWooOrders } from "../hooks/use-orders";
import { mergeOrder } from "../lib/merge-orders";
import { WOO_STATUSES } from "../lib/order-utils";
import type { OrderFilters, OrdersSourceFilter, UnifiedOrder } from "../types";
import { OrdersTable } from "./orders-table";

const SOURCES: { value: OrdersSourceFilter; label: string; hint: string }[] = [
  { value: "all", label: "All orders", hint: "Every WooCommerce order — app and phone/office" },
  { value: "app", label: "App", hint: "Placed in the 108Medz app (Firebase), with wallet, COD and reward details" },
  { value: "phone", label: "Phone / office", hint: "Created by staff in WooCommerce admin" },
  { value: "unsynced", label: "Not synced", hint: "App orders that never reached WooCommerce (e.g. abandoned online payments)" },
];

const dateClass = "[color-scheme:light] dark:[color-scheme:dark] w-full sm:w-38";

function readFilters(sp: URLSearchParams): OrderFilters {
  const source = (sp.get("source") as OrdersSourceFilter) || "all";
  return {
    source: SOURCES.some((s) => s.value === source) ? source : "all",
    status: sp.get("status") || "any",
    search: sp.get("q") || "",
    from: sp.get("from") || "",
    to: sp.get("to") || "",
  };
}

export function OrdersDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filters = React.useMemo(() => readFilters(new URLSearchParams(sp)), [sp]);
  const pager = useUrlPageState(25);
  const [search, setSearch] = React.useState(filters.search);
  React.useEffect(() => setSearch(filters.search), [filters.search]);

  const appMode = filters.source === "app" || filters.source === "unsynced";
  const woo = useWooOrders(filters, pager.page, pager.pageSize, !appMode);
  // App / Not synced: app orders since the From date (default: last 12 months), paged in the browser
  const appFrom = React.useMemo(() => {
    if (filters.from) return new Date(`${filters.from}T00:00:00`);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [filters.from]);
  const app = useAppOrders(appFrom, appMode);

  function update(next: Partial<OrderFilters>, keepPage = false) {
    const f = { ...filters, ...next };
    const q = new URLSearchParams();
    if (f.source !== "all") q.set("source", f.source);
    if (f.status !== "any") q.set("status", f.status);
    if (f.search) q.set("q", f.search);
    if (f.from) q.set("from", f.from);
    if (f.to) q.set("to", f.to);
    if (keepPage && pager.page > 1) q.set("page", String(pager.page));
    if (sp.get("size")) q.set("size", sp.get("size")!);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  }

  // App mode: filter the loaded app orders, take one page, then fetch live Woo status for just that page
  const appFiltered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;
    return app.data
      .map((a) => mergeOrder(null, a))
      .filter((o) => {
        if (filters.source === "unsynced" && !o.unsynced) return false;
        if (filters.status !== "any" && o.status !== filters.status) return false;
        if (to && o.createdAt && o.createdAt > to) return false;
        if (!q) return true;
        return [o.number, o.customer.name, o.customer.phone, o.customer.email].some((v) => v?.toLowerCase().includes(q));
      });
  }, [app.data, filters]);
  const appPage = paginate(appFiltered, pager.page, pager.pageSize);
  const pageWooIds = appPage.items.map((o) => o.wooId).filter((x): x is number => Boolean(x));
  const wooForPage = useWooByIds(appMode ? pageWooIds : []);
  const appRows: UnifiedOrder[] = React.useMemo(() => {
    const byId = new Map(wooForPage.data.map((w) => [w.id, w]));
    const appById = new Map(app.data.map((a) => [a.id, a]));
    return appPage.items.map((o) => {
      const raw = o.appId ? appById.get(o.appId) : undefined;
      const w = o.wooId ? byId.get(o.wooId) : undefined;
      return raw && w ? mergeOrder(w, raw) : o;
    });
  }, [appPage.items, wooForPage.data, app.data]);

  const rows = appMode ? appRows : (woo.data?.rows ?? []);
  const loading = appMode ? app.loading : woo.loading;
  const fetching = appMode ? app.fetching : woo.fetching;
  const error = appMode ? app.error : woo.error;
  const warning = appMode ? wooForPage.error : woo.data?.appError;
  const active = filters.status !== "any" || filters.search || filters.from || filters.to;
  const hint = SOURCES.find((s) => s.value === filters.source)?.hint;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Orders"
        description={
          !appMode && woo.data
            ? `${woo.data.total.toLocaleString("en-IN")} orders${filters.source === "all" ? " across app and phone/office" : ""}.`
            : appMode
              ? `${appFiltered.length.toLocaleString("en-IN")} ${filters.source === "unsynced" ? "app orders not in WooCommerce" : "app orders"}.`
              : "App orders from Firebase and phone/office orders from WooCommerce, in one list."
        }
      />

      <div className="mb-3 flex gap-1 overflow-x-auto rounded-lg border p-1 sm:w-fit">
        {SOURCES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => update({ source: s.value })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              filters.source === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {hint && <p className="text-muted-foreground mb-4 text-xs">{hint}</p>}

      <Card className="gap-0 py-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: search.trim() });
          }}
          className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center"
        >
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order #, customer name, phone or email — press Enter"
              className="pl-9"
            />
          </div>
          <Select value={filters.status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WOO_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} className={dateClass} />
            <span className="text-muted-foreground text-sm">–</span>
            <Input type="date" aria-label="To" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} className={dateClass} />
          </div>
          {active && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch("");
                update({ ...DEFAULT_ORDER_FILTERS, source: filters.source });
              }}
            >
              <X /> Clear
            </Button>
          )}
        </form>

        {warning && (
          <div className="bg-warning/10 text-warning flex items-start gap-2 border-b px-4 py-2 text-xs">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {appMode ? `Live WooCommerce status unavailable: ${warning}` : `App details (wallet, rewards) unavailable: ${warning}`}
          </div>
        )}
        {appMode && (
          <p className="text-muted-foreground border-b px-4 py-2 text-xs">
            App orders since {appFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            {filters.from ? "" : " (last 12 months — set a From date to go further back)"}.
          </p>
        )}

        {error ? (
          <EmptyState icon={AlertTriangle} title="Could not load orders" description={error.message} />
        ) : loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No orders found"
            description={active ? "Try different filters." : filters.source === "unsynced" ? "Every loaded app order is in WooCommerce." : undefined}
          />
        ) : (
          <div className={cn("transition-opacity", fetching && !loading && "opacity-60")}>
            <OrdersTable rows={rows} />
          </div>
        )}
      </Card>

      {!loading && !error && rows.length > 0 && (
        <DataPagination
          className="mt-3"
          state={pager}
          total={appMode ? appPage.total : (woo.data?.total ?? null)}
          pageItemCount={rows.length}
          fetching={fetching}
          itemLabel="orders"
          sizes={[25, 50, 100]}
        />
      )}
    </div>
  );
}
