import { searchdataRepository as repo } from "../repository/searchdata.repository";
import { sinceFor } from "../lib/searchdata-utils";
import { SEARCH_LOAD_LIMIT, SEARCH_PRESETS, type SearchHistory, type SearchPreset, type Searcher } from "../types";

/** Searcher lookups are shared across pages/tabs for the session. */
const userCache = new Map<string, Searcher | null>();

export const searchdataService = {
  async load(preset: SearchPreset): Promise<SearchHistory> {
    const days = SEARCH_PRESETS.find((p) => p.value === preset)?.days ?? 30;
    const entries = await repo.fetchSince(sinceFor(days), SEARCH_LOAD_LIMIT);
    return { entries, capped: entries.length >= SEARCH_LOAD_LIMIT };
  },

  async users(ids: string[]): Promise<Record<string, Searcher | null>> {
    const missing = [...new Set(ids)].filter((id) => id && !userCache.has(id));
    if (missing.length) {
      const found = await repo.fetchUsers(missing);
      for (const id of missing) userCache.set(id, null);
      for (const u of found) userCache.set(u.id, u);
    }
    return Object.fromEntries(ids.map((id) => [id, userCache.get(id) ?? null]));
  },
};
