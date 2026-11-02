import {
  DocumentReference,
  Timestamp,
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";

import { normalizeTerm } from "../lib/searchdata-utils";
import type { SearchEntry, Searcher } from "../types";

type Raw = Record<string, unknown>;

function userIdOf(ref: unknown): string | null {
  if (ref instanceof DocumentReference) return ref.id;
  if (typeof ref === "string" && ref.trim()) return ref.replace(/^\//, "").split("/").pop() || null;
  return null;
}

export const searchdataRepository = {
  /** Newest-first searches since `since` (null = all time), at most `max`. */
  async fetchSince(since: Date | null, max: number): Promise<SearchEntry[]> {
    const c: QueryConstraint[] = [];
    if (since) c.push(where("searchTime", ">=", Timestamp.fromDate(since)));
    c.push(orderBy("searchTime", "desc"), limit(max));
    const snap = await getDocs(query(collection(db, COLLECTIONS.searchHistory), ...c));
    return snap.docs.map((d) => {
      const x = d.data() as Raw;
      const term = typeof x.searchTerm === "string" ? x.searchTerm : String(x.searchTerm ?? "");
      return {
        id: d.id,
        term,
        key: normalizeTerm(term),
        time: x.searchTime instanceof Timestamp ? x.searchTime.toDate() : null,
        userId: userIdOf(x.userRef),
        found: typeof x.searchResult === "boolean" ? x.searchResult : null,
      };
    });
  },

  /** Users/{id} for up to N ids (30 per Firestore `in` query). */
  async fetchUsers(ids: string[]): Promise<Searcher[]> {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
    const snaps = await Promise.all(
      chunks.map((c) => getDocs(query(collection(db, COLLECTIONS.users), where(documentId(), "in", c))))
    );
    return snaps.flatMap((s) =>
      s.docs.map((d) => {
        const u = d.data() as Raw;
        return {
          id: d.id,
          name: String(u.display_name || u.name || ""),
          phone: String(u.phone_number || ""),
        };
      })
    );
  },
};
