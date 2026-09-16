/**
 * Per-IP sliding-window rate limiting for the routes that perform work.
 *
 * The only consumer is `src/middleware.ts`, which runs on the Edge runtime —
 * so this module stays import-free and dependency-free on purpose (no node:
 * builtins, no Next imports) and can be unit-tested outside the Edge runtime.
 */
export const WINDOW_MS = 60_000;

/** Hard bound on the bucket map; exceeding it drops every bucket. */
export const MAX_BUCKETS = 5000;

/** One throttled route family. `match` is a plain path predicate. */
export interface RateTier {
  name: string;
  limit: number;
  methods: string[];
  match: (path: string) => boolean;
}

// Tier table: every route that performs — or replays — a live scan is metered
// at 30/min (GET and POST); GET /embed at 120/min (embed-heavy pages behind
// NAT). Query strings are irrelevant: buckets key on tier + IP.
const TIERS: RateTier[] = [
  {
    name: "scan",
    limit: 30,
    methods: ["GET", "POST"],
    match: (p) =>
      p === "/api/v1/scan" ||
      p === "/api/v1/verify" ||
      p === "/api/v1/manifest" ||
      p === "/api/v1/og" ||
      p === "/t",
  },
  {
    name: "embed",
    limit: 120,
    methods: ["GET"],
    match: (p) => p === "/embed" || p.startsWith("/embed/"),
  },
];

/** The tier that throttles this request, or null when the route is unmetered. */
export function tierFor(method: string, path: string): RateTier | null {
  const m = method.toUpperCase();
  for (const tier of TIERS) {
    if (tier.methods.includes(m) && tier.match(path)) return tier;
  }
  return null;
}

const HITS = new Map<string, number[]>();

/**
 * Records one hit for `tier:ip` and reports whether the caller is now over the
 * limit. Mutates the bucket, so call it exactly once per request.
 */
export function limited(tierName: string, ip: string, limit: number): boolean {
  const key = `${tierName}:${ip}`;
  const now = Date.now();
  const arr = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(key, arr);
  if (HITS.size > MAX_BUCKETS) HITS.clear();
  return arr.length > limit;
}

/** Test seam: drop every bucket so a suite starts from a clean window. */
export function resetBuckets(): void {
  HITS.clear();
}