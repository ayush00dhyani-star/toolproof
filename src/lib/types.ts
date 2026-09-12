export type Sev = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  rule: string;
  sev: Sev;
  title: string;
  where: string;
  evidence?: string;
  why: string;
}

export type ScanKind = "auto" | "mcp" | "api";
export type ScanState = "verified" | "unverified" | "opted-out";

export interface ScanReport {
  v: 1;
  target: string;
  host: string;
  kind: "mcp" | "openapi" | "unknown";
  state: ScanState;
  scannedAt: string;
  durationMs: number;
  score: number;
  grade: string;
  summary: string;
  findings: Finding[];
  findingCounts: Record<Sev, number>;
  positives: string[];
  meta: Record<string, unknown>;
}
