"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { DataPagination } from "@/components/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { timeAgo } from "@/lib/time-ago";

import { useSearchers } from "../hooks/use-search-data";
import type { TermStat } from "../types";
import { NewOrderButton, SearcherCell } from "./searcher-cell";

/** Most searched medicines; expand a row to see who searched it. */
export function TopSearchesTable({ stats, resetKey }: { stats: TermStat[]; resetKey: unknown }) {
  const pager = usePageState(20, resetKey);
  const page = paginate(stats, pager.page, pager.pageSize);
  const [open, setOpen] = React.useState<string | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8 pl-4" />
            <TableHead>Search term</TableHead>
            <TableHead className="text-right">People</TableHead>
            <TableHead className="text-right">Searches</TableHead>
            <TableHead>Last searched</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.items.map((s, i) => {
            const rank = (page.page - 1) * pager.pageSize + i + 1;
            const expanded = open === s.key;
            return (
              <React.Fragment key={s.key}>
                <TableRow className="cursor-pointer" onClick={() => setOpen(expanded ? null : s.key)}>
                  <TableCell className="text-muted-foreground pl-4">
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground w-6 text-xs tabular-nums">{rank}</span>
                      <span className="font-medium">{s.term}</span>
                      {s.notFound > 0 && (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          No results ×{s.notFound}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.people}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.searches}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{timeAgo(s.lastSearched)}</TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell />
                    <TableCell colSpan={4} className="py-3">
                      <People ids={s.userIds} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      <DataPagination className="border-t p-3" state={pager} total={page.total} itemLabel="terms" />
    </>
  );
}

function People({ ids }: { ids: string[] }) {
  const shown = ids.slice(0, 30);
  const { users, loading } = useSearchers(shown);
  if (ids.length === 0) return <p className="text-muted-foreground text-sm">No customer recorded for these searches.</p>;
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">Searched by</p>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((id) => (
          <li key={id} className="bg-background flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <SearcherCell id={id} user={users[id]} loading={loading} />
            <NewOrderButton userId={users[id] ? id : null} />
          </li>
        ))}
      </ul>
      {ids.length > shown.length && (
        <p className="text-muted-foreground text-xs">+{ids.length - shown.length} more people</p>
      )}
    </div>
  );
}
