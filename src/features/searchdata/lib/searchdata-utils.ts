import type { SearchEntry, TermStat } from "../types";

export const normalizeTerm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/** Group searches by normalised term → counts, distinct people, last time, "no results" count. */
export function groupTerms(entries: SearchEntry[]): TermStat[] {
  const map = new Map<string, { spellings: Map<string, number>; users: Set<string>; stat: TermStat }>();
  for (const e of entries) {
    if (!e.key) continue;
    let g = map.get(e.key);
    if (!g) {
      g = {
        spellings: new Map(),
        users: new Set(),
        stat: { key: e.key, term: e.term, searches: 0, people: 0, userIds: [], lastSearched: null, notFound: 0 },
      };
      map.set(e.key, g);
    }
    g.stat.searches++;
    g.spellings.set(e.term.trim(), (g.spellings.get(e.term.trim()) ?? 0) + 1);
    if (e.userId) g.users.add(e.userId);
    if (e.found === false) g.stat.notFound++;
    if (e.time && (!g.stat.lastSearched || e.time > g.stat.lastSearched)) g.stat.lastSearched = e.time;
  }
  return [...map.values()]
    .map(({ spellings, users, stat }) => ({
      ...stat,
      term: [...spellings].sort((a, b) => b[1] - a[1])[0]?.[0] ?? stat.term,
      people: users.size,
      userIds: [...users],
    }))
    .sort((a, b) => b.people - a.people || b.searches - a.searches || (b.lastSearched?.getTime() ?? 0) - (a.lastSearched?.getTime() ?? 0));
}

export function sinceFor(days: number | null): Date | null {
  if (!days) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}
