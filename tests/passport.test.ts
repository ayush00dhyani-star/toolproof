import { describe, expect, it } from "vitest";
import { passportOf } from "../src/lib/passport";
import type { ScanReport } from "../src/lib/types";

function report(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    v: 1,
    target: "https://example.com/mcp",
    host: "example.com",
    kind: "mcp",
    state: "verified",
    scannedAt: "2026-09-12T00:00:00.000Z",
    durationMs: 1234,
    score: 88,
    grade: "A",
    summary: "Clean scan — no agent-hijack patterns found.",
    findings: [
      { rule: "TP-103", sev: "medium", title: "Outbound URL in tool text", where: "tools/search", why: "w" },
      { rule: "TP-102", sev: "critical", title: "Instruction override phrasing", where: "tools/search", why: "w" },
      { rule: "TP-103", sev: "medium", title: "Outbound URL in tool text", where: "tools/other", why: "w" },
    ],
    findingCounts: { critical: 1, high: 0, medium: 2, low: 0, info: 0 },
    positives: ["HTTPS enforced"],
    meta: {},
    ...overrides,
  };
}

describe("passportOf", () => {
  it("emits exactly the contract key set, in the fixed order", () => {
    expect(Object.keys(passportOf(report()))).toEqual([
      "v",
      "kind",
      "target",
      "host",
      "state",
      "scannedAt",
      "score",
      "grade",
      "summary",
      "findingCounts",
      "ruleIds",
      "positives",
      "scanner",
    ]);
  });

  it("derives ruleIds as the sorted unique rules of the findings", () => {
    expect(passportOf(report()).ruleIds).toEqual(["TP-102", "TP-103"]);
  });

  it("carries scanner identity and passthrough fields", () => {
    const p = passportOf(report());
    expect(p.scanner).toEqual({ name: "toolproof", version: "0.1.0" });
    expect(p.v).toBe(1);
    expect(p.kind).toBe("mcp");
    expect(p.host).toBe("example.com");
    expect(p.score).toBe(88);
    expect(p.grade).toBe("A");
    expect(p.findingCounts).toEqual({ critical: 1, high: 0, medium: 2, low: 0, info: 0 });
    expect(p.positives).toEqual(["HTTPS enforced"]);
  });

  it("is byte-stable for identical reports (the signing input)", () => {
    // same report built twice via overrides — key order in the passport is fixed
    const a = passportOf(report());
    const b = passportOf(report());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("works for the opted-out state", () => {
    const p = passportOf(
      report({
        kind: "unknown",
        state: "opted-out",
        grade: "—",
        score: 100,
        findings: [],
        findingCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        positives: ["toolproof.txt honored"],
      }),
    );
    expect(p.state).toBe("opted-out");
    expect(p.ruleIds).toEqual([]);
    expect(p.positives).toEqual(["toolproof.txt honored"]);
  });
});
