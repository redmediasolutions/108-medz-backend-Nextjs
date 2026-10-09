"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, timeAgo } from "@/lib/time-ago";

import { usePrescription } from "../hooks/use-prescriptions";
import { MedicinesTable } from "./medicines-table";
import { PrescriptionImageCard } from "./prescription-image-card";
import { PrescriptionStatusBadge } from "./prescription-status-badge";
import { ReadyStatusCard } from "./ready-status-card";

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2" asChild>
      <Link href="/prescriptions">
        <ArrowLeft /> Prescriptions
      </Link>
    </Button>
  );
}

export function PrescriptionDetail({ prescriptionId }: { prescriptionId: string }) {
  const { data: p, loading, error } = usePrescription(prescriptionId);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <BackLink />
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-80 lg:col-span-3" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="mx-auto max-w-7xl">
        <BackLink />
        <Card>
          <EmptyState
            icon={error ? AlertTriangle : FileQuestion}
            title={error ? "Something went wrong" : "Prescription not found"}
            description={error?.message ?? "It may have been archived or deleted."}
          />
        </Card>
      </div>
    );
  }

  const info = [
    { label: "Customer", value: p.customerName || "-" },
    { label: "Mobile", value: p.customerMobile || "-" },
    { label: "Label", value: p.prescriptionLabel || "-" },
    { label: "Uploaded", value: `${timeAgo(p.uploadedTime)} · ${formatDateTime(p.uploadedTime)}` },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {p.prescriptionID ? <span className="font-mono">{p.prescriptionID}</span> : "Prescription"}
        </h1>
        <PrescriptionStatusBadge isReady={p.isReady} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="grid content-start gap-6 lg:col-span-3">
          <Card className="px-6 py-5">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {info.map((row) => (
                <div key={row.label} className="min-w-0">
                  <dt className="text-muted-foreground text-xs font-medium">{row.label}</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <ReadyStatusCard docId={p.docId} isReady={p.isReady} />
          <MedicinesTable prescription={p} />
        </div>
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20">
            <PrescriptionImageCard imageUrl={p.prescriptionImage} fileName={p.prescriptionID || p.docId} />
          </div>
        </div>
      </div>
    </div>
  );
}
