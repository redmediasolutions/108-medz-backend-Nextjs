"use client";

import { DataPagination } from "@/components/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginate, usePageState } from "@/hooks/use-pagination";
import { formatDateTime, timeAgo } from "@/lib/time-ago";

import { useSearchers } from "../hooks/use-search-data";
import type { SearchEntry } from "../types";
import { NewOrderButton, SearcherCell } from "./searcher-cell";

/** Every search, newest first (port of the Flutter Search data list). */
export function RecentSearchesTable({ entries, resetKey }: { entries: SearchEntry[]; resetKey: unknown }) {
  const pager = usePageState(20, resetKey);
  const page = paginate(entries, pager.page, pager.pageSize);
  const { users, loading } = useSearchers(page.items.map((e) => e.userId).filter((x): x is string => Boolean(x)));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Search term</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>When</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.items.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.term || "—"}</span>
                  {e.found === false && (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      No results
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <SearcherCell id={e.userId} user={e.userId ? users[e.userId] : null} loading={loading} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm" title={formatDateTime(e.time)}>
                {timeAgo(e.time)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <NewOrderButton userId={e.userId && users[e.userId] ? e.userId : null} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DataPagination className="border-t p-3" state={pager} total={page.total} itemLabel="searches" />
    </>
  );
}
