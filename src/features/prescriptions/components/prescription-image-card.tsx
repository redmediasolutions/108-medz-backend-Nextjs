"use client";

import * as React from "react";
import { Download, ExternalLink, ImageOff, Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function PrescriptionImageCard({ imageUrl, fileName }: { imageUrl: string; fileName: string }) {
  const [zoom, setZoom] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  async function download() {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.${blob.type.split("/")[1] || "jpg"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Storage CORS not configured → fall back to opening the file.
      window.open(imageUrl, "_blank", "noopener");
    }
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Prescription image</CardTitle>
        {imageUrl && !failed && (
          <CardAction className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(true)} aria-label="Enlarge">
              <Maximize2 />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a href={imageUrl} target="_blank" rel="noreferrer" aria-label="Open in new tab">
                <ExternalLink />
              </a>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <div className="px-6">
        {imageUrl && !failed ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="bg-muted/50 block aspect-[3/4] w-full overflow-hidden rounded-lg border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Prescription"
              className="size-full object-contain"
              onError={() => setFailed(true)}
            />
          </button>
        ) : (
          <div className="bg-muted/50 text-muted-foreground flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border text-sm">
            <ImageOff className="size-6" />
            {imageUrl ? "Image could not be loaded" : "No image uploaded"}
          </div>
        )}
      </div>
      {imageUrl && (
        <div className="flex justify-end px-6">
          <Button variant="outline" size="sm" onClick={download}>
            <Download /> Download
          </Button>
        </div>
      )}

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-h-[92svh] p-2 sm:max-w-4xl">
          <DialogTitle className="sr-only">Prescription image</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Prescription" className="max-h-[88svh] w-full rounded object-contain" />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
