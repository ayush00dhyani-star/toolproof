/**
 * Watchlist — the browser-side change monitor. A pinned tool stores the
 * toolTextHash from its last scan; any later visit (or the leaderboard
 * watchlist) re-scans and compares hashes. Changed hash = the tool's
 * model-visible text changed since you last looked.
 *
 * Server-side cron recipes that do the same against /api/v1/verify are in
 * /docs#monitoring. No accounts, no server storage — your watchlist is
 * yours.
 */

export interface WatchEntry {
  target: string;
  host: string;
  grade: string;
  state: string;
  toolTextHash?: string;
  /** Snapshot of the model-visible text at pin time — diffed on change. */
  toolTextSnapshot?: string;
  at: number;
}

const KEY = "toolproof.watch.v1";
const MAX = 12;

export function loadWatch(): WatchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is WatchEntry =>
          !!e &&
          typeof e === "object" &&
          typeof (e as WatchEntry).target === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveWatch(entries: WatchEntry[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

export function isWatched(target: string): WatchEntry | undefined {
  return loadWatch().find((e) => e.target === target);
}

/** Pin or refresh a tool. Newest first; dedupes by target. */
export function watchEntry(entry: Omit<WatchEntry, "at">): boolean {
  const rest = loadWatch().filter((e) => e.target !== entry.target);
  return saveWatch([{ ...entry, at: Date.now() }, ...rest]);
}

export function unwatch(target: string): boolean {
  return saveWatch(loadWatch().filter((e) => e.target !== target));
}
