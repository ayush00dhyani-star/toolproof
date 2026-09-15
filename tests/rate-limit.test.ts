import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BUCKETS,
  WINDOW_MS,
  limited,
  resetBuckets,
  tierFor,
} from "../src/lib/rate-limit";

// The middleware tier table is what keeps the scan-performing endpoints from
// being used as a free, unbounded network probe: every one of them must be
// metered, and the counter must actually refuse the request past the limit.

describe("tierFor — which routes are metered", () => {
  it("meters every route that performs or replays a live scan at 30/min", () => {
    for (const path of [
      "/api/v1/scan",
      "/api/v1/verify",
      "/api/v1/manifest",
      "/api/v1/og",
      "/t",
    ]) {
      expect(tierFor("GET", path)?.name).toBe("scan");
      expect(tierFor("GET", path)?.limit).toBe(30);
    }
    expect(tierFor("POST", "/api/v1/scan")?.name).toBe("scan");
    expect(tierFor("POST", "/api/v1/verify")?.name).toBe("scan");
    expect(tierFor("POST", "/api/v1/manifest")?.name).toBe("scan");
  });

  it("meters the embed card at 120/min, GET only", () => {
    expect(tierFor("GET", "/embed")).toEqual(
      expect.objectContaining({ name: "embed", limit: 120 }),
    );
    expect(tierFor("GET", "/embed/abc")?.name).toBe("embed");
    expect(tierFor("POST", "/embed")).toBeNull();
  });

  it("leaves routes that do no work unmetered", () => {
    for (const path of [
      "/",
      "/docs",
      "/lock",
      "/leaderboard",
      "/for-agents",
      "/api/v1/pubkey",
    ]) {
      expect(tierFor("GET", path)).toBeNull();
    }
  });

  it("matches the method case-insensitively and never a path prefix", () => {
    expect(tierFor("get", "/api/v1/manifest")?.name).toBe("scan");
    expect(tierFor("GET", "/api/v1/manifest/extra")).toBeNull();
    expect(tierFor("GET", "/tx")).toBeNull();
  });
});

describe("limited — sliding window", () => {
  beforeEach(() => resetBuckets());

  afterEach(() => {
    vi.useRealTimers();
    resetBuckets();
  });

  it("allows exactly the limit, then refuses", () => {
    for (let i = 0; i < 30; i += 1) {
      expect(limited("scan", "203.0.113.7", 30)).toBe(false);
    }
    expect(limited("scan", "203.0.113.7", 30)).toBe(true);
  });

  it("buckets per IP and per tier", () => {
    for (let i = 0; i < 31; i += 1) limited("scan", "203.0.113.7", 30);
    expect(limited("scan", "203.0.113.8", 30)).toBe(false);
    expect(limited("embed", "203.0.113.7", 120)).toBe(false);
  });

  it("forgets hits that fall outside the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T00:00:00.000Z"));
    for (let i = 0; i < 30; i += 1) limited("scan", "198.51.100.4", 30);
    expect(limited("scan", "198.51.100.4", 30)).toBe(true);

    vi.setSystemTime(new Date(Date.now() + WINDOW_MS + 1000));
    expect(limited("scan", "198.51.100.4", 30)).toBe(false);
  });

  it("drops every bucket once the map exceeds MAX_BUCKETS", () => {
    for (let i = 0; i < 31; i += 1) limited("scan", "192.0.2.1", 30);
    expect(limited("scan", "192.0.2.1", 30)).toBe(true);

    for (let i = 0; i <= MAX_BUCKETS; i += 1) limited("scan", `ip-${i}`, 30);
    // The full-sweep reset dropped the attacker's bucket rather than growing
    // memory without bound — a documented, deliberate trade-off.
    expect(limited("scan", "192.0.2.1", 30)).toBe(false);
  });

  it("uses a 60s window", () => {
    expect(WINDOW_MS).toBe(60_000);
  });
});