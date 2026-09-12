import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEDGER_CHANGED_EVENT,
  loadMyVerdicts,
  recordMyVerdict,
} from "../src/lib/my-ledger";

// Controlled clock so the 60s dedupe window is exercisable.
let now = 1_700_000_000_000;

// Minimal real localStorage: a small in-memory object with the same
// getItem/setItem semantics, assigned onto globalThis (via stubGlobal).
// This is a stand-in storage, not a mock of the unit under test.
const store: Record<string, string> = {};
const storageStub = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
};

const dispatched: string[] = [];

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  dispatched.length = 0;
  // The module is client-guarded on `window`, so the storage rides in on a
  // window stub; dispatchEvent is recorded so the change event is asserted.
  vi.stubGlobal("window", {
    localStorage: storageStub,
    dispatchEvent: (e: Event) => {
      dispatched.push(e.type);
      return true;
    },
  });
  vi.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function verdict(target: string, grade = "A") {
  return {
    host: target.replace(/^https?:\/\//, "").split("/")[0],
    target,
    kind: "mcp",
    state: "verified" as const,
    score: 95,
    grade,
  };
}

describe("my-ledger (browser receipts)", () => {
  it("keeps at most 20 entries, newest first", () => {
    for (let i = 1; i <= 25; i++) {
      now += 1000;
      recordMyVerdict(verdict(`https://h${i}.example.com/mcp`));
    }
    const mine = loadMyVerdicts();
    expect(mine).toHaveLength(20);
    expect(mine[0].target).toBe("https://h25.example.com/mcp");
    expect(mine[19].target).toBe("https://h6.example.com/mcp");
  });

  it("refreshes a repeat pull of the same target within 60s in place", () => {
    recordMyVerdict(verdict("https://a.example.com/mcp", "B"));
    for (let i = 1; i <= 9; i++) {
      now += 1000;
      recordMyVerdict(verdict(`https://h${i}.example.com/mcp`));
    }
    expect(loadMyVerdicts()).toHaveLength(10);

    now += 30_000; // 30s after the first pull of a.example.com
    recordMyVerdict(verdict("https://a.example.com/mcp", "A+"));
    const mine = loadMyVerdicts();
    // No new row: a.example.com moved to the newest position with the
    // refreshed grade and timestamp.
    expect(mine).toHaveLength(10);
    expect(mine[0].target).toBe("https://a.example.com/mcp");
    expect(mine[0].grade).toBe("A+");
    expect(mine[0].at).toBe(now);
  });

  it("treats a repeat pull outside the 60s window as a new entry", () => {
    recordMyVerdict(verdict("https://a.example.com/mcp"));
    now += 61_000;
    recordMyVerdict(verdict("https://a.example.com/mcp"));
    const mine = loadMyVerdicts();
    expect(mine).toHaveLength(2);
    expect(mine[0].target).toBe("https://a.example.com/mcp");
    expect(mine[1].target).toBe("https://a.example.com/mcp");
    expect(mine[0].at).toBeGreaterThan(mine[1].at);
  });

  it("persists to storage and fires toolproof:ledger-changed", () => {
    recordMyVerdict(verdict("https://a.example.com/mcp"));
    // Round-trips through the raw storage stub, not the module.
    expect(JSON.parse(store["toolproof.ledger.v1"])).toHaveLength(1);
    expect(loadMyVerdicts()).toHaveLength(1);
    expect(dispatched).toEqual([LEDGER_CHANGED_EVENT]);
  });
});
