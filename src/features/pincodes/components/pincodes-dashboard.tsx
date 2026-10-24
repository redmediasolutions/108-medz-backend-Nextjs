"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download, Link2, Loader2, MapPin, RefreshCw, Search } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatINRStrict } from "@/lib/format";
import { timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

import { useAreaData } from "../hooks/use-area-data";
import { phoneKeys } from "../lib/normalize";
import { RANGE_LABEL, UNKNOWN_PINCODE, type RangePreset } from "../types";
import { PersonClusterCard } from "./person-cluster-card";
import { RangeTabs, readRange } from "./range-tabs";
import { SourceLegend, SourceSplit } from "./source-split";
import { StatTile } from "./stat-tile";

type View = "areas" | "people";

export function PincodesDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const range = readRange(sp.get("range"));
  const view: View = sp.get("view") === "people" ? "people" : "areas";
  const [query, setQuery] = React.useState("");
  const [onlyMulti, setOnlyMulti] = React.useState(false);
  const { data, loading, error, refresh } = useAreaData(range);

  function setParam(k: string, v: string | null) {
    const q = new URLSearchParams(sp);
    if (v) q.set(k, v);
    else q.delete(k);
    router.replace(`${pathname}?${q}`, { scroll: false });
  }

  const q = query.trim().toLowerCase();
  const stats = React.useMemo(() => {
    if (!data) return [];
    return data.stats.filter(
      (s) =>
        (!onlyMulti || s.multiIdentityPeople > 0) &&
        (!q || s.pincode.includes(q) || s.city.toLowerCase().includes(q) || s.state.toLowerCase().includes(q))
    );
  }, [data, q, onlyMulti]);

  const linked = React.useMemo(() => {
    if (!data) return [];
    return data.clusters.filter(
      (c) =>
        c.multiIdentity &&
        (!q ||
          c.pincodes.some((p) => p.includes(q)) ||
          c.names.some((n) => n.toLowerCase().includes(q)) ||
          c.phones.some((p) => p.includes(q.replace(/\D/g, "") || "#")))
    );
  }, [data, q]);

  const known = data?.stats.filter((s) => s.pincode !== UNKNOWN_PINCODE) ?? [];
  const unknown = data?.stats.find((s) => s.pincode === UNKNOWN_PINCODE);
  const totalOrders = data?.orders.length ?? 0;
  const phoneCount = data ? new Set(data.orders.flatMap((o) => phoneKeys(o.customer.phone))).size : 0;
  const multiPeople = data?.clusters.filter((c) => c.multiIdentity).length ?? 0;
  const maxOrders = Math.max(1, ...stats.map((s) => s.orders));
  const areaPager = usePageState(25, [range, q, onlyMulti]);
  const peoplePager = usePageState(20, [range, q]);
  const areaView = paginate(stats, areaPager.page, areaPager.pageSize);
  const peopleView = paginate(linked, peoplePager.page, peoplePager.pageSize);

  function exportCsv() {
    if (!data) return;
    downloadCsv(`orders-by-pincode-${range}.csv`, [
      ["Pincode", "Area", "State", "Orders", "People", "Multi-device people", "Revenue", "Avg order", "App", "Phone/office", "Website", "Cancelled", "First order", "Last order"],
      ...stats.map((s) => [
        s.pincode,
        s.city,
        s.state,
        s.orders,
        s.people,
        s.multiIdentityPeople,
        s.revenue.toFixed(2),
        s.avgOrder.toFixed(2),
        s.bySource.app,
        s.bySource.phone,
        s.bySource.website,
        s.cancelled,
        s.firstOrderAt?.toISOString().slice(0, 10) ?? "",
        s.lastOrderAt?.toISOString().slice(0, 10) ?? "",
      ]),
    ]);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Areas"
        description="Where orders come from by delivery pincode — and which phones / app accounts belong to the same person."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn(loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data || loading}>
              <Download /> Export
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <RangeTabs value={range} onChange={(r: RangePreset) => setParam("range", r === "90d" ? null : r)} />
        {data && !loading && (
          <span className="text-muted-foreground text-xs">
            {totalOrders.toLocaleString("en-IN")} orders · updated {timeAgo(new Date(data.loadedAt))}
          </span>
        )}
      </div>

      {error ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Could not load orders" description={error.message} />
        </Card>
      ) : (
        <>
          {(data?.truncated || data?.appError) && (
            <div className="bg-warning/10 text-warning mb-4 grid gap-1 rounded-lg px-4 py-2 text-xs">
              {data.truncated && <span>Only the latest 6,000 WooCommerce orders in this range are included — pick a shorter range for exact numbers.</span>}
              {data.appError && <span>App order details unavailable ({data.appError}) — app orders are counted from WooCommerce only.</span>}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Pincodes" value={known.length} sub={unknown ? `${unknown.orders} order${unknown.orders === 1 ? "" : "s"} without a valid pincode` : undefined} loading={loading} />
            <StatTile label="Orders" value={totalOrders.toLocaleString("en-IN")} sub={RANGE_LABEL[range]} loading={loading} />
            <StatTile
              label="Real people"
              value={data?.clusters.length.toLocaleString("en-IN") ?? 0}
              sub={phoneCount ? `from ${phoneCount.toLocaleString("en-IN")} phone numbers` : undefined}
              loading={loading}
            />
            <StatTile
              label="Ordering from multiple phones / accounts"
              value={multiPeople}
              tone={multiPeople ? "text-warning" : ""}
              sub="click to review"
              loading={loading}
              onClick={() => setParam("view", "people")}
              active={view === "people"}
            />
          </div>

          <Card className="gap-0 py-0">
            <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
              <div className="flex gap-1 rounded-lg border p-1">
                {(["areas", "people"] as View[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setParam("view", v === "areas" ? null : v)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium",
                      view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v === "areas" ? "By pincode" : `Same person, many phones${multiPeople ? ` (${multiPeople})` : ""}`}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={view === "areas" ? "Pincode, area or state" : "Pincode, name or phone"}
                  className="pl-9"
                />
              </div>
              {view === "areas" && (
                <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={onlyMulti} onChange={(e) => setOnlyMulti(e.target.checked)} className="accent-primary size-4" />
                  Only areas with multi-phone people
                </label>
              )}
            </div>

            {loading && !data ? (
              <div className="grid gap-2 p-4">
                <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading every order in {RANGE_LABEL[range].toLowerCase()} from WooCommerce and the app…
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : view === "people" ? (
              linked.length === 0 ? (
                <EmptyState icon={Link2} title="No one found ordering from multiple phones" description="Everyone in this range uses a single phone / account." />
              ) : (
                <div className="grid gap-3 p-3 sm:p-4">
                  <p className="text-muted-foreground text-xs">
                    Grouped by same phone, email or app account, or the same / near-identical address in the same pincode. Family members at one address will also group together.
                  </p>
                  {peopleView.items.map((c) => (
                    <PersonClusterCard key={c.id} person={c} />
                  ))}
                  <DataPagination state={{ ...peoplePager, page: peopleView.page }} total={peopleView.total} itemLabel="people" sizes={[10, 20, 50]} />
                </div>
              )
            ) : stats.length === 0 ? (
              <EmptyState icon={MapPin} title="No areas match" />
            ) : (
              <>
                <div className="flex justify-end border-b px-4 py-2">
                  <SourceLegend />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Pincode</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead className="w-56">Orders</TableHead>
                      <TableHead className="text-right">People</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg order</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="pr-4">Last order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areaView.items.map((s) => {
                      const unknownRow = s.pincode === UNKNOWN_PINCODE;
                      return (
                        <TableRow
                          key={s.pincode}
                          className={cn(!unknownRow && "cursor-pointer")}
                          onClick={() => !unknownRow && router.push(`/pincodes/${s.pincode}${range !== "90d" ? `?range=${range}` : ""}`)}
                        >
                          <TableCell className="pl-4 font-mono font-semibold">
                            {unknownRow ? <span className="text-muted-foreground font-sans font-normal italic">No pincode</span> : s.pincode}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-44 truncate">{s.city || "—"}</div>
                            {s.state && <div className="text-muted-foreground text-xs">{s.state}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${(s.orders / maxOrders) * 100}%` }} />
                              </div>
                              <span className="w-10 text-right font-medium tabular-nums">{s.orders}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.people}
                            {s.multiIdentityPeople > 0 && (
                              <Badge variant="warning" className="ml-2 px-1.5" title={`${s.multiIdentityPeople} people order from more than one phone / account`}>
                                <Link2 /> {s.multiIdentityPeople}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatINRStrict(s.revenue)}</TableCell>
                          <TableCell className="text-muted-foreground text-right tabular-nums">{formatINRStrict(s.avgOrder)}</TableCell>
                          <TableCell>
                            <SourceSplit value={s.bySource} />
                          </TableCell>
                          <TableCell className="pr-4 text-sm" title={formatDate(s.lastOrderAt)}>
                            {s.lastOrderAt ? timeAgo(s.lastOrderAt) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <DataPagination className="border-t px-4 py-3" state={{ ...areaPager, page: areaView.page }} total={areaView.total} itemLabel="pincodes" sizes={[25, 50, 100]} />
              </>
            )}
          </Card>
          {view === "areas" && !loading && stats.length > 0 && (
            <p className="text-muted-foreground mt-3 text-xs">
              People = real people after merging phones/accounts that belong to the same person.{" "}
              <Link href="/orders" className="text-primary hover:underline">
                All orders
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
