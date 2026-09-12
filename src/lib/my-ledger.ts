import type { ScanState } from "./types";

/**
 * The browser-side half of the Ledger: verdicts YOU pulled, receipted in
 * your own browser via localStorage.
 *
 * HONEST SCOPE: the server-side feed (src/lib/feed.ts) is a per-node,
 * in-memory ring — and on Vercel every route is a separately-bundled
 * function, so a scan recorded by /api/v1/scan is invisible to
 * /api/v1/feed. Until the v1 KV-backed cross-user ledger ships, the only
 * ledger that reliably follows a visitor is this one.
 *
 * Client-safe: no node imports, and every window access is guarded so
 * importing this module from a server component is harmless (the functions
 * are no-ops off the browser).
 */

export interface MyVerdict {
  host: string;
  target: string;
  kind: string;
  state: ScanState;
  score: number;
  grade: string;
  at: number; // epoch ms, when the verdict was pulled
}

const KEY = "toolproof.ledger.v1";
const MAX = 20; // receipts kept, newest first — the oldest falls off beyond this
const DEDUPE_MS = 60_000; // same target within this window refreshes, not adds

/** Fired on window after every successful record; Ledger + HeroStat listen. */
export const LEDGER_CHANGED_EVENT = "toolproof:ledger-changed";

export function loadMyVerdicts(): MyVerdict[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMyVerdict);
  } catch {
    return []; // storage blocked or corrupt — start clean
  }
}

export function recordMyVerdict(v: Omit<MyVerdict, "at">): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const ledger = loadMyVerdicts();
  const idx = ledger.findIndex((e) => e.target === v.target);
  if (idx !== -1 && now - ledger[idx].at < DEDUPE_MS) {
    // Same target within the dedupe window: refresh the existing entry
    // to the newest position with the newest verdict — don't add a row.
    ledger.splice(idx, 1);
  }
  ledger.unshift({ ...v, at: now });
  if (ledger.length > MAX) ledger.length = MAX;
  if (!save(ledger)) return;
  notify();
}

function save(ledger: MyVerdict[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ledger));
    return true;
  } catch {
    return false; // quota or privacy mode — the receipt is dropped quietly
  }
}

function notify(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(LEDGER_CHANGED_EVENT));
  }
}

/** Light shape check so junk in storage can never reach the UI. */
function isMyVerdict(e: unknown): e is MyVerdict {
  if (typeof e !== "object" || e === null) return false;
  const v = e as Record<string, unknown>;
  return (
    typeof v.host === "string" &&
    typeof v.target === "string" &&
    typeof v.kind === "string" &&
    typeof v.state === "string" &&
    typeof v.score === "number" &&
    typeof v.grade === "string" &&
    typeof v.at === "number"
  );
}
