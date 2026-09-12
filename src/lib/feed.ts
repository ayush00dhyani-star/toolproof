import type { ScanState } from "./types";

/**
 * The Ledger's in-memory verdict feed.
 *
 * HONEST LIMITATION: this is a per-instance, in-memory ring. It lives on
 * one server node, resets on every cold start, and is never persisted.
 * The UI says "on this node" for exactly this reason — it is a live
 * window into scan activity, not an audit log.
 *
 * Deliberately imports nothing from scan.ts (routes wire recording in)
 * so there is no import cycle.
 */

export interface FeedEntry {
  host: string;
  target: string;
  kind: string;
  state: ScanState;
  score: number;
  grade: string;
  at: number; // epoch ms, when the verdict was recorded
}

const MAX = 50; // ring capacity — the oldest entry falls off beyond this
const SNAPSHOT_SIZE = 20; // items returned per snapshot
const DEDUPE_MS = 60_000; // same target within this window refreshes, not adds

const ring: FeedEntry[] = []; // newest first
let total = 0; // entries ever added (dedupes refresh in place, not counted)

export function record(
  entry: Omit<FeedEntry, "at">,
): void {
  const now = Date.now();
  const idx = ring.findIndex((e) => e.target === entry.target);
  if (idx !== -1 && now - ring[idx].at < DEDUPE_MS) {
    // Same target within the dedupe window: refresh the existing entry
    // to the newest position with the newest verdict — don't add a row.
    ring.splice(idx, 1);
    ring.unshift({ ...entry, at: now });
    return;
  }
  ring.unshift({ ...entry, at: now });
  total += 1;
  if (ring.length > MAX) ring.length = MAX;
}

export function snapshot(): { total: number; items: FeedEntry[] } {
  return { total, items: ring.slice(0, SNAPSHOT_SIZE) };
}

/** Test-only: wipe the ring and counter between tests. */
export function __resetFeedForTests(): void {
  ring.length = 0;
  total = 0;
}
