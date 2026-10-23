import { cn } from "@/lib/utils";

import { RANGE_LABEL, type RangePreset } from "../types";

export const RANGES: RangePreset[] = ["30d", "90d", "12m", "all"];

export function RangeTabs({ value, onChange }: { value: RangePreset; onChange: (r: RangePreset) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border p-1">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            value === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

export function readRange(v: string | null): RangePreset {
  return RANGES.includes(v as RangePreset) ? (v as RangePreset) : "90d";
}
