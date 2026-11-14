"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, BarChart3, ChevronLeft, ChevronRight, Download, Info, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { DataPagination } from "@/components/data-pagination";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatTile } from "@/features/pincodes/components/stat-tile";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { formatINRStrict } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useMonthSales } from "../hooks/use-month-sales";
import { isValidMonth, monthKeyOf, monthLabel, shiftMonth } from "../lib/month";
import type { ProductSales, ReportScope } from "../types";

type SortKey = "units" | "revenue" | "orders" | "name";

/** Products sold per month. Firebase orders win over their WooCommerce copy; Woo-only orders are added. */
export function SalesReport() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const thisMonth = monthKeyOf(new Date());
  const month = isValidMonth(sp.get("month")) ? sp.get("month")! : thisMonth;
  const scope: ReportScope = sp.get("scope") === "completed" ? "completed" : "confirmed";

  const [text, setText] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("units");
  const { report, data, loading, fetching, error, refresh } = useMonthSales(month, scope);

  function setParam(k: string, v: string | null) {
    const q = new URLSearchParams(sp);
    if (v === null) q.delete(k);
    else q.set(k, v);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  }

  const rows = React.useMemo(() => {
    const t = text.trim().toLowerCase();
    const list = (report?.products ?? []).filter((p) => !t || p.name.toLowerCase().includes(t) || String(p.productId) === t.replace("#", ""));
    const by: Record<SortKey, (a: ProductSales, b: ProductSales) => number> = {
      units: (a, b) => b.units - a.units || b.revenue - a.revenue,
      revenue: (a, b) => b.revenue - a.revenue,
      orders: (a, b) => b.orders - a.orders || b.units - a.units,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [report, text, sort]);

  const pager = usePageState(25, [month, scope, text, sort]);
  const page = paginate(rows, pager.page, pager.pageSize);
  const rank = new Map((report?.products ?? []).map((p, i) => [p.key, i + 1]));

  function exportCsv() {
    if (!report) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      ["Rank", "Product ID", "Product", "Units sold", "Orders", "Revenue (items, ex. tax)", "Avg price", "Units from Firebase orders", "Units from WooCommerce-only orders"],
      ...rows.map((p) => [
        rank.get(p.key) ?? "",
        p.productId || "",
        p.name,
        p.units,
        p.orders,
        p.revenue.toFixed(2),
        p.units ? (p.revenue / p.units).toFixed(2) : "",
        p.unitsFirebase,
        p.unitsWoo,
      ]),
    ].map((r) => r.map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `products-sold-${month}${scope === "completed" ? "-completed" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports"
        description="Products sold each month — every order counted once, from Firebase when it's there, otherwise from WooCommerce."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={fetching}
              onClick={() => refresh().catch((e: Error) => toast.error(e.message))}
            >
              <RefreshCw className={cn(fetching && "animate-spin")} /> Refresh
            </Button>
            <Button onClick={exportCsv} disabled={!report || rows.length === 0}>
              <Download /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Month + scope */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => setParam("month", shiftMonth(month, -1))}>
            <ChevronLeft />
          </Button>
          <Input
            type="month"
            value={month}
            max={thisMonth}
            onChange={(e) => isValidMonth(e.target.value) && setParam("month", e.target.value === thisMonth ? null : e.target.value)}
            className="w-44"
            aria-label="Month"
          />
          <Button
            size="icon"
            variant="outline"
            aria-label="Next month"
            disabled={month >= thisMonth}
            onClick={() => {
              const next = shiftMonth(month, 1);
              setParam("month", next === thisMonth ? null : next);
            }}
          >
            <ChevronRight />
          </Button>
          <span className="text-muted-foreground hidden text-sm sm:inline">{monthLabel(month)}</span>
        </div>
        <div className="flex gap-1 rounded-lg border p-1 sm:w-fit">
          {(
            [
              ["confirmed", "All confirmed orders"],
              ["completed", "Completed only"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setParam("scope", v === "confirmed" ? null : v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                scope === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Units sold" value={(report?.units ?? 0).toLocaleString("en-IN")} loading={loading} />
        <StatTile label="Different products" value={(report?.products.length ?? 0).toLocaleString("en-IN")} loading={loading} />
        <StatTile
          label="Orders counted"
          value={((report?.ordersFirebase ?? 0) + (report?.ordersWoo ?? 0)).toLocaleString("en-IN")}
          sub={report ? `${report.ordersFirebase} Firebase · ${report.ordersWoo} WooCommerce-only` : undefined}
          loading={loading}
        />
        <StatTile
          label="Item sales"
          value={formatINRStrict(report?.revenue ?? 0)}
          sub="medicines only · excl. tax, delivery, COD"
          loading={loading}
        />
      </div>

      <div className="text-muted-foreground mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {scope === "completed"
            ? "Only orders marked Completed are counted."
            : "Counted: COD orders and paid online orders. Left out: cancelled, failed, refunded and unpaid online orders."}{" "}
          {report && report.excluded > 0 && `${report.excluded} order${report.excluded === 1 ? "" : "s"} left out this month. `}
          Orders in both systems are counted once, using Firebase&apos;s items.
        </span>
      </div>

      {data?.truncated && (
        <div className="text-warning mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <AlertTriangle className="size-4" /> Too many WooCommerce orders this month — only the latest 6,000 were loaded.
        </div>
      )}

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by medicine name or product ID" className="pl-9" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            >
              <option value="units">Units sold</option>
              <option value="revenue">Sales (₹)</option>
              <option value="orders">Orders</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {error ? (
          <EmptyState icon={AlertTriangle} title="Could not load the report" description={error.message} />
        ) : loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title={text ? "No matching products" : "No products sold"}
            description={text ? "Try another name or product ID." : `Nothing was sold in ${monthLabel(month)} with this filter.`}
          />
        ) : (
          <div className={cn(fetching && "opacity-60 transition-opacity")}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-4">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units sold</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Avg price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="text-muted-foreground pl-4 tabular-nums">{rank.get(p.key)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {p.productId > 0 ? <span className="font-mono">#{p.productId}</span> : "No product ID"}
                        {p.unitsWoo > 0 && p.unitsFirebase > 0 && (
                          <span>
                            {" "}
                            · {p.unitsFirebase} Firebase · {p.unitsWoo} WooCommerce
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{p.units.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINRStrict(p.revenue)}</TableCell>
                    <TableCell className="text-muted-foreground hidden text-right tabular-nums md:table-cell">
                      {p.units ? formatINRStrict(p.revenue / p.units) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataPagination className="border-t p-3" state={pager} total={page.total} itemLabel="products" />
          </div>
        )}
      </Card>
    </div>
  );
}
