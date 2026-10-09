"use client";

import * as React from "react";
import { Pill, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { AddMedicineSheet } from "../addform/add-medicine-sheet";
import type { Prescription } from "../types";
import { MedicineRow } from "./medicine-row";

export function MedicinesTable({ prescription }: { prescription: Prescription }) {
  const [open, setOpen] = React.useState(false);
  const { items, docId } = prescription;

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b pb-4">
        <CardTitle>Medicines</CardTitle>
        <CardDescription>
          {items.length} item{items.length === 1 ? "" : "s"} · press Enter or click away to save a comment
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Add medicine
          </Button>
        </CardAction>
      </CardHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medicines added yet"
          description="Read the prescription image and add each medicine from the store catalogue."
          action={
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus /> Add first medicine
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Medicine</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Comment / substitute</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <MedicineRow key={item.productId} item={item} docId={docId} />
            ))}
          </TableBody>
        </Table>
      )}

      <AddMedicineSheet open={open} onOpenChange={setOpen} prescription={prescription} />
    </Card>
  );
}
