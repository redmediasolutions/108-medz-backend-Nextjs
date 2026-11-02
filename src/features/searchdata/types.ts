/** Firestore searchHistory/{id} — every search typed in the 108 Medz app (see Flutter pages/searchdata). */
export type SearchEntry = {
  id: string;
  term: string;
  /** lower-case, single-spaced — used to group "Dolo 650" and "dolo  650" together */
  key: string;
  time: Date | null;
  /** Users doc id from userRef (DocumentReference or "Users/x" string), null when missing */
  userId: string | null;
  /** false = the app showed no results (only recorded by newer app versions) */
  found: boolean | null;
};

/** Searcher details, from Users/{id} */
export type Searcher = {
  id: string;
  name: string;
  phone: string;
};

export type SearchPreset = "7d" | "30d" | "90d" | "all";

export const SEARCH_PRESETS: { value: SearchPreset; label: string; days: number | null }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];

/** Most searches loaded for one range — the newest ones win if there are more. */
export const SEARCH_LOAD_LIMIT = 5000;

export type SearchHistory = {
  entries: SearchEntry[];
  /** true when SEARCH_LOAD_LIMIT was reached (older searches in the range not loaded) */
  capped: boolean;
};

export type TermStat = {
  key: string;
  /** most common spelling */
  term: string;
  searches: number;
  people: number;
  userIds: string[];
  lastSearched: Date | null;
  /** searches the app recorded as "no results" */
  notFound: number;
};
