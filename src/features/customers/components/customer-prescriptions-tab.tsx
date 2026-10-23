"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrescriptionStatusBadge } from "@/features/prescriptions/components/prescription-status-badge";
import type { Prescription } from "@/features/prescriptions/types";
import { formatDateTime, timeAgo } from "@/lib/time-ago";

export function CustomerPrescriptionsTab({
  prescriptions,
  loading,
  error,
}: {
  prescriptions: Prescription[];
  loading: boolean;
  error: Error | null;
}) {
  const router = useRouter();
  const pager = usePageState(10);
  const view = paginate(prescriptions, pager.page, pager.pageSize);
  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (error) {
    return (
      <Card>
        <EmptyState icon={AlertTriangle} title="Could not load prescriptions" description={error.message} />
      </Card>
    );
  }
  if (prescriptions.length === 0) {
    return (
      <Card>
        <EmptyState icon={ClipboardList} title="No prescriptions uploaded" />
      </Card>
    );
  }
  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Prescription</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="pr-4 text-right">Medicines</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.items.map((p) => (
            <TableRow key={p.docId} className="cursor-pointer" onClick={() => router.push(`/prescriptions/${p.docId}`)}>
              <TableCell className="pl-4 font-mono text-xs font-medium">
                {p.prescriptionID || p.docId.slice(0, 8)}
                {p.isArchive && (
                  <Badge variant="outline" className="ml-2 font-sans">
                    Archived
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{p.prescriptionLabel || "-"}</TableCell>
              <TableCell>
                <PrescriptionStatusBadge isReady={p.isReady} />
              </TableCell>
              <TableCell title={formatDateTime(p.uploadedTime)}>{timeAgo(p.uploadedTime)}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{p.items.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {view.total > 10 && <DataPagination className="border-t px-4 py-3" state={{ ...pager, page: view.page }} total={view.total} itemLabel="prescriptions" />}
    </Card>
  );
}
