"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarRange, Download, Loader2, Search, Users, X } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { timeAgo } from "@/lib/time-ago";

import { EMPTY_FILTERS, useCustomers } from "../hooks/use-customers";
import { describeRange, todayInput } from "../lib/customer-utils";
import type { CustomerFilters } from "../types";
import { CustomerAvatar } from "./customer-avatar";
import { CustomerRoleBadge, CustomerTypeBadge } from "./customer-badges";
import { CustomerRowActionsMenu } from "./customer-row-actions-menu";
import { ExportCustomersDialog } from "./export-customers-dialog";

const dateClass = "[color-scheme:light] dark:[color-scheme:dark] w-full sm:w-40";

/** Port of pages/customers/customers.dart */
export function CustomersDashboard() {
  const router = useRouter();
  const [draft, setDraft] = React.useState<CustomerFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = React.useState<CustomerFilters>(EMPTY_FILTERS);
  const [exportOpen, setExportOpen] = React.useState(false);
  const { items, loading, loadingMore, hasMore, error, total, loadMore } = useCustomers(filters);

  const dirty = draft.phone !== filters.phone || draft.from !== filters.from || draft.to !== filters.to;
  const active = Boolean(filters.phone || filters.from || filters.to);
  const invalidRange = Boolean(draft.from && draft.to && draft.from > draft.to);

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    if (invalidRange) return;
    setFilters({ ...draft, phone: draft.phone.trim() });
  }
  function clear() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  }

  const range = describeRange(filters.from, filters.to);
  const description =
    total === null
      ? "Registered and guest users of the 108Medz app."
      : `${total.toLocaleString("en-IN")} customer${total === 1 ? "" : "s"}${range ? ` joined ${range}` : ""}.`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Customers"
        description={description}
        actions={
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download /> Export
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <form onSubmit={apply} className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="Search by phone number, press Enter"
              inputMode="tel"
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="text-muted-foreground hidden items-center gap-1.5 text-sm lg:flex">
              <CalendarRange className="size-4" /> Joined
            </div>
            <Input
              type="date"
              aria-label="Joined from"
              value={draft.from}
              max={draft.to || todayInput()}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className={dateClass}
              disabled={Boolean(draft.phone.trim())}
            />
            <span className="text-muted-foreground hidden text-sm sm:inline">–</span>
            <Input
              type="date"
              aria-label="Joined to"
              value={draft.to}
              min={draft.from || undefined}
              max={todayInput()}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className={dateClass}
              disabled={Boolean(draft.phone.trim())}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={!dirty || invalidRange} className="flex-1 sm:flex-none">
                Apply
              </Button>
              {(active || dirty) && (
                <Button type="button" variant="ghost" onClick={clear}>
                  <X /> Clear
                </Button>
              )}
            </div>
          </div>
        </form>
        {draft.phone.trim() && (draft.from || draft.to) && (
          <p className="text-muted-foreground border-b px-4 py-2 text-xs">
            Phone search is an exact match, so the date range is ignored while a phone number is entered.
          </p>
        )}

        {error ? (
          <EmptyState icon={AlertTriangle} title="Could not load customers" description={error.message} />
        ) : loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={
              filters.phone
                ? `No customer with phone number ${filters.phone}.`
                : active
                  ? "Nobody joined in this date range."
                  : "Customers will appear here once they sign up."
            }
            action={
              active ? (
                <Button variant="outline" size="sm" onClick={clear}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <CustomerAvatar name={c.name} photoUrl={c.photoUrl} />
                      <div className="min-w-0">
                        <div className="max-w-56 truncate font-medium">{c.name || "Unnamed"}</div>
                        <div className="text-muted-foreground max-w-56 truncate text-xs">{c.email || "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{c.phone || "-"}</TableCell>
                  <TableCell title={c.createdAt ? timeAgo(c.createdAt) : undefined}>{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <CustomerTypeBadge customer={c} />
                  </TableCell>
                  <TableCell>
                    <CustomerRoleBadge customer={c} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.isProfileComplete ? "Complete" : "Incomplete"}
                  </TableCell>
                  <TableCell className="pr-3">
                    <CustomerRowActionsMenu customer={c} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && !error && items.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Showing {items.length}
            {total !== null ? ` of ${total.toLocaleString("en-IN")}` : ""}
          </p>
          {hasMore && (
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore && <Loader2 className="animate-spin" />} Load more
            </Button>
          )}
        </div>
      )}

      <ExportCustomersDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        defaultFrom={filters.phone ? "" : filters.from}
        defaultTo={filters.phone ? "" : filters.to}
      />
    </div>
  );
}
