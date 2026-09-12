import type { ScanReport } from "./types";

/**
 * The signed passport — the exact key set consumers verify, in a fixed
 * order so the canonical bytes are stable.
 */
export function passportOf(r: ScanReport): Record<string, unknown> {
  return {
    v: r.v,
    kind: r.kind,
    target: r.target,
    host: r.host,
    state: r.state,
    scannedAt: r.scannedAt,
    score: r.score,
    grade: r.grade,
    summary: r.summary,
    findingCounts: r.findingCounts,
    ruleIds: [...new Set(r.findings.map((f) => f.rule))].sort(),
    positives: r.positives,
    scanner: { name: "toolproof", version: "0.1.0" },
  };
}
