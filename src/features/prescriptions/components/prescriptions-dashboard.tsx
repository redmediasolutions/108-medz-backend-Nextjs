"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, Search } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { paginate, useUrlPageState } from "@/hooks/use-pagination";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

import { usePrescriptions } from "../hooks/use-prescriptions";
import { filterPrescriptions } from "../lib/prescription-utils";
import type { PrescriptionStatusFilter } from "../types";
import { PrescriptionRowActionsMenu } from "./prescription-row-actions-menu";
import { PrescriptionStatusBadge } from "./prescription-status-badge";

export function PrescriptionsDashboard() {
  const router = useRouter();
  const { data, loading, error } = usePrescriptions();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<PrescriptionStatusFilter>("all");

  const filtered = React.useMemo(() => filterPrescriptions(data, query, status), [data, query, status]);
  const pager = useUrlPageState(20);
  const view = paginate(filtered, pager.page, pager.pageSize);
  // New search / status → back to page 1
  const filterKey = `${query}|${status}`;
  const lastKey = React.useRef(filterKey);
  React.useEffect(() => {
    if (lastKey.current !== filterKey) {
      lastKey.current = filterKey;
      if (pager.page !== 1) pager.setPage(1);
    }
  }, [filterKey, pager]);
  const pendingCount = data.filter((p) => !p.isReady).length;
  const readyCount = data.length - pendingCount;

  const stats: { label: string; value: number; filter: PrescriptionStatusFilter; tone: string }[] = [
    { label: "Active", value: data.length, filter: "all", tone: "text-foreground" },
    { label: "Pending", value: pendingCount, filter: "pending", tone: "text-warning" },
    { label: "Prepared", value: readyCount, filter: "ready", tone: "text-success" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Prescriptions" description="Uploaded prescriptions from the app. Updates in real time." />

      <div className="mb-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatus(s.filter)}
            className={cn(
              "bg-card rounded-xl border p-4 text-left transition-colors hover:border-primary/40",
              status === s.filter && "border-primary ring-primary/20 ring-2"
            )}
          >
            <div className="text-muted-foreground text-xs font-medium sm:text-sm">{s.label}</div>
            <div className={cn("mt-1 text-xl font-semibold tabular-nums sm:text-2xl", s.tone)}>
              {loading ? <Skeleton className="h-7 w-10" /> : s.value}
            </div>
          </button>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, customer, mobile or label"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as PrescriptionStatusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="ready">Prepared</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Something went wrong"
            description={error.message || "Could not load prescriptions."}
          />
        ) : loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={data.length === 0 ? "No prescriptions found" : "No matches"}
            description={data.length === 0 ? "New uploads will appear here automatically." : "Try a different search or status."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Prescription ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.items.map((p) => (
                <TableRow
                  key={p.docId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/prescriptions/${p.docId}`)}
                >
                  <TableCell className="pl-4 font-mono text-xs font-medium">{p.prescriptionID || "-"}</TableCell>
                  <TableCell className="font-medium">{p.customerName || "-"}</TableCell>
                  <TableCell className="tabular-nums">{p.customerMobile || "-"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-48 truncate">{p.prescriptionLabel || "-"}</TableCell>
                  <TableCell>
                    <PrescriptionStatusBadge isReady={p.isReady} />
                  </TableCell>
                  <TableCell className="text-muted-foreground" title={formatDateTime(p.uploadedTime)}>
                    {timeAgo(p.uploadedTime)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.items.length}</TableCell>
                  <TableCell className="pr-3">
                    <PrescriptionRowActionsMenu prescription={p} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {!loading && !error && filtered.length > 0 && (
        <DataPagination className="mt-3" state={{ ...pager, page: view.page }} total={view.total} itemLabel={filtered.length === data.length ? "prescriptions" : `of ${data.length} prescriptions`} />
      )}
    </div>
  );
}
