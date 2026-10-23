"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, MapPinOff, Package, Pill, Users } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { formatDate, formatINRStrict } from "@/lib/format";

import { useAreaData } from "../hooks/use-area-data";
import { topProducts } from "../lib/aggregate";
import { orderPincode } from "../lib/normalize";
import { RANGE_LABEL } from "../types";
import { PersonClusterCard } from "./person-cluster-card";
import { RangeTabs, readRange } from "./range-tabs";
import { SourceLegend, SourceSplit } from "./source-split";
import { StatTile } from "./stat-tile";

const TABS = ["people", "orders", "products"] as const;
type Tab = (typeof TABS)[number];

export function PincodeDetail({ pincode }: { pincode: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const range = readRange(sp.get("range"));
  const tab: Tab = TABS.includes(sp.get("tab") as Tab) ? (sp.get("tab") as Tab) : "people";
  const [onlyMulti, setOnlyMulti] = React.useState(false);
  const { data, loading, error } = useAreaData(range);

  function setParam(k: string, v: string | null) {
    const q = new URLSearchParams(sp);
    if (v) q.set(k, v);
    else q.delete(k);
    router.replace(`${pathname}?${q}`, { scroll: false });
  }

  const stat = data?.stats.find((s) => s.pincode === pincode);
  const orders = React.useMemo(() => data?.orders.filter((o) => orderPincode(o) === pincode) ?? [], [data, pincode]);
  const people = React.useMemo(() => {
    if (!data) return [];
    const keys = new Set(orders.map((o) => o.key));
    return data.clusters.filter((c) => c.orders.some((o) => keys.has(o.key)) && (!onlyMulti || c.multiIdentity));
  }, [data, orders, onlyMulti]);
  const products = React.useMemo(() => topProducts(orders, 20), [orders]);
  const peoplePager = usePageState(10, [range, onlyMulti, pincode]);
  const orderPager = usePageState(20, [range, pincode]);
  const peopleView = paginate(people, peoplePager.page, peoplePager.pageSize);
  const orderView = paginate(orders, orderPager.page, orderPager.pageSize);

  const back = (
    <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2" asChild>
      <Link href={`/pincodes${range !== "90d" ? `?range=${range}` : ""}`}>
        <ArrowLeft /> Areas
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {back}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{pincode}</h1>
          <p className="text-muted-foreground text-sm">
            {stat ? [stat.city, stat.state].filter(Boolean).join(", ") || "Area" : loading ? "Loading…" : "No orders in this range"}
          </p>
        </div>
        <RangeTabs value={range} onChange={(r) => setParam("range", r === "90d" ? null : r)} />
      </div>

      {error ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Could not load orders" description={error.message} />
        </Card>
      ) : loading && !data ? (
        <div className="grid gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading orders…
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !stat ? (
        <Card>
          <EmptyState
            icon={MapPinOff}
            title={`No orders to ${pincode} in ${RANGE_LABEL[range].toLowerCase()}`}
            action={
              range !== "all" ? (
                <Button variant="outline" size="sm" onClick={() => setParam("range", "all")}>
                  Try all time
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Orders" value={stat.orders} sub={stat.cancelled ? `${stat.cancelled} cancelled / failed` : undefined} />
            <StatTile label="Revenue" value={formatINRStrict(stat.revenue)} sub={`avg ${formatINRStrict(stat.avgOrder)}`} />
            <StatTile
              label="Real people"
              value={stat.people}
              sub={stat.multiIdentityPeople ? `${stat.multiIdentityPeople} use multiple phones / accounts` : "one phone each"}
              tone=""
            />
            <StatTile
              label="Ordering since"
              value={formatDate(stat.firstOrderAt)}
              sub={
                <span className="inline-flex items-center gap-2">
                  <SourceSplit value={stat.bySource} className="w-16" /> {stat.bySource.app} app · {stat.bySource.phone} phone
                </span>
              }
            />
          </div>

          <Tabs value={tab} onValueChange={(t) => setParam("tab", t === "people" ? null : t)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="people">
                  <Users /> People {stat.people}
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <Package /> Orders {stat.orders}
                </TabsTrigger>
                <TabsTrigger value="products">
                  <Pill /> Top products
                </TabsTrigger>
              </TabsList>
              {tab === "people" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={onlyMulti} onChange={(e) => setOnlyMulti(e.target.checked)} className="accent-primary size-4" />
                  Only people with multiple phones
                </label>
              )}
              {tab === "orders" && <SourceLegend />}
            </div>

            <TabsContent value="people" className="grid gap-3">
              {people.length === 0 ? (
                <Card>
                  <EmptyState icon={Users} title="No one with multiple phones here" />
                </Card>
              ) : (
                <>
                  {peopleView.items.map((p) => (
                    <PersonClusterCard key={p.id} person={p} currentPincode={pincode} />
                  ))}
                  <DataPagination state={{ ...peoplePager, page: peopleView.page }} total={peopleView.total} itemLabel="people" sizes={[10, 20, 50]} />
                </>
              )}
            </TabsContent>
            <TabsContent value="orders">
              <Card className="gap-0 py-0">
                <OrdersTable rows={orderView.items} />
                <DataPagination className="border-t px-4 py-3" state={{ ...orderPager, page: orderView.page }} total={orderView.total} itemLabel="orders" />
              </Card>
            </TabsContent>
            <TabsContent value="products">
              <Card className="gap-0 py-0">
                <ul className="divide-y">
                  {products.map((p, i) => (
                    <li key={`${p.productId}-${p.name}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground w-6 text-right tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {p.orders} order{p.orders === 1 ? "" : "s"} · {p.quantity} units
                      </span>
                    </li>
                  ))}
                  {products.length === 0 && <li className="text-muted-foreground px-4 py-6 text-sm">No items recorded.</li>}
                </ul>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
