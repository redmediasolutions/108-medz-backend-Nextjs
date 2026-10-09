"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Clock, ExternalLink, ImageIcon, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { prescriptionsService } from "../services/prescriptions.service";
import type { Prescription } from "../types";

export function PrescriptionRowActionsMenu({ prescription: p }: { prescription: Prescription }) {
  async function toggleReady() {
    try {
      await prescriptionsService.setReady(p.docId, !p.isReady);
      toast.success(p.isReady ? "Marked as pending" : "Marked as prepared");
    } catch {
      toast.error("Could not update status");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={`/prescriptions/${p.docId}`}>
            <ExternalLink /> Open
          </Link>
        </DropdownMenuItem>
        {p.prescriptionImage && (
          <DropdownMenuItem asChild>
            <a href={p.prescriptionImage} target="_blank" rel="noreferrer">
              <ImageIcon /> View image
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleReady}>
          {p.isReady ? <Clock /> : <CheckCircle2 />}
          {p.isReady ? "Mark pending" : "Mark prepared"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
