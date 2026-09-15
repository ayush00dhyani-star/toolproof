/** Wire shapes of an exported evidence bundle — matches the CLI's evidence.mjs. */

export interface EvidenceReceipt {
  v: number;
  kind: "toolproof.evidence";
  ts: string;
  actor: string;
  target: string;
  decision: "in-sync" | "review-required" | "blocked";
  exitCode: number;
  baselineFingerprint: string | null;
  observedFingerprint: string | null;
  changeSummary?: { block: number; review: number; informational: number };
  policy?: string;
  keyId: string;
  prev: string | null;
  hash: string;
  signature: string;
}

export interface EvidenceBundle {
  v: number;
  kind: "toolproof.evidence.export";
  issuedAt: string;
  keyId: string | null;
  /** SPKI PEM the auditor imports — the bundle is self-contained. */
  issuerKey: string;
  total: number;
  range: { from: number; to: number };
  receipts: EvidenceReceipt[];
  signature: string;
}
