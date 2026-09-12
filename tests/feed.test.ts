import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { record, snapshot, __resetFeedForTests } from "../src/lib/feed";

// Controlled clock so the 60s dedupe window is exercisable.
let now = 1_700_000_000_000;

function entry(target: string, grade = "A") {
  return {
    host: target.replace(/^https?:\/\//, "").split("/")[0],
    target,
    kind: "mcp",
    state: "verified" as const,
    score: 95,
    grade,
  };
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockImplementation(() => now);
  __resetFeedForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("feed ring buffer", () => {
  it("returns at most 20 items, newest first", () => {
    for (let i = 1; i <= 25; i++) {
      now += 1000;
      record(entry(`https://h${i}.example.com/mcp`));
    }
    const s = snapshot();
    expect(s.total).toBe(25);
    expect(s.items).toHaveLength(20);
    expect(s.items[0].target).toBe("https://h25.example.com/mcp");
    expect(s.items[19].target).toBe("https://h6.example.com/mcp");
  });

  it("caps the ring at 50 entries", () => {
    // Fill exactly to capacity: t1 sits at the oldest end, still in the ring.
    for (let i = 1; i <= 50; i++) {
      now += 1000;
      record(entry(`https://h${i}.example.com/mcp`));
    }
    // One more pushes t1 out of the 50-slot ring.
    now += 1000;
    record(entry("https://h51.example.com/mcp"));
    // A re-scan of the evicted t1 within the dedupe window must ADD
    // (total 52) — if the ring had not evicted it, this would be a
    // dedupe refresh and total would stay 51.
    now += 1000;
    record(entry("https://h1.example.com/mcp"));
    expect(snapshot().total).toBe(52);
  });

  it("dedupes the same target within 60s by refreshing, not adding", () => {
    record(entry("https://a.example.com/mcp", "B"));
    for (let i = 1; i <= 9; i++) {
      now += 1000;
      record(entry(`https://h${i}.example.com/mcp`));
    }
    expect(snapshot().total).toBe(10);

    now += 30_000; // 30s after the first scan of a.example.com
    record(entry("https://a.example.com/mcp", "A"));
    const s = snapshot();
    // No new entry; a.example.com moved to the newest position with the
    // refreshed grade and timestamp.
    expect(s.total).toBe(10);
    expect(s.items[0].target).toBe("https://a.example.com/mcp");
    expect(s.items[0].grade).toBe("A");
    expect(s.items[0].at).toBe(now);
    // Nothing was evicted by the refresh — the 9 others are all still there.
    expect(snapshot().items).toHaveLength(10);
  });

  it("treats a re-scan outside the 60s window as a new entry", () => {
    record(entry("https://a.example.com/mcp"));
    now += 61_000;
    record(entry("https://a.example.com/mcp"));
    const s = snapshot();
    expect(s.total).toBe(2);
    expect(s.items[0].target).toBe("https://a.example.com/mcp");
    expect(s.items[1].target).toBe("https://a.example.com/mcp");
    expect(s.items[0].at).toBeGreaterThan(s.items[1].at);
  });
});
