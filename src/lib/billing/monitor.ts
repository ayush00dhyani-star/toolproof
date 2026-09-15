/**
 * Monitoring engine — the continuity layer that the Team tier sells.
 *
 * The free CLI answers "is this surface the one I approved?" once, when a
 * human runs it. This answers it on a schedule: a monitored target is
 * re-observed, and when its capability fingerprint moves off the pinned
 * baseline, an alert fires to the webhook the customer configured.
 *
 * Stored data is deliberately minimal — a target, a fingerprint, a tier and
 * an alert endpoint. Never prompt content, tool arguments or results.
 */
import { TIERS, type TierName } from "./tiers";

/**
 * The capability surface of a target, as the monitor needs it. The fingerprint
 * is the canonical hash of the surface — computed by the manifest builder, not
 * present on a raw scan report — so the scanner returns the manifest.
 */
export type Scanner = (target: string) => Promise<{
  fingerprint?: string | null;
  state: string;
  grade: string;
}>;

let scanner: Scanner | null = null;

/** Wire the real scanner. Called once by the API routes. */
export function configureScanner(s: Scanner): void {
  scanner = s;
}

export interface Monitor {
  /** Capability token: the only credential a watcher presents. */
  token: string;
  target: string;
  host: string;
  /** Fingerprint pinned when monitoring started, from the committed baseline. */
  baselineFingerprint: string | null;
  /** Last observed fingerprint, so a stable target alerts once, not hourly. */
  lastFingerprint: string | null;
  tier: TierName;
  /** Webhook to POST alerts to (Slack, Discord, PagerDuty, a SIEM ingest). */
  alertUrl: string | null;
  createdAt: number;
  lastCheckedAt: number | null;
  lastAlertedFingerprint: string | null;
}

const STORE = new Map<string, Monitor>();
const BY_TARGET = new Map<string, string>();

export interface RegisterInput {
  target: string;
  tier: TierName;
  alertUrl?: string | null;
  baselineFingerprint?: string | null;
}

export function registerMonitor(input: RegisterInput): Monitor {
  const tier = TIERS[input.tier];
  if (!tier || tier.monitoredTargets === 0)
    throw new Error(`tier "${input.tier}" does not include monitoring`);

  const existing = BY_TARGET.get(input.target);
  if (existing) return STORE.get(existing) as Monitor;

  const token = crypto.randomUUID();
  const m: Monitor = {
    token,
    target: input.target,
    host: hostOf(input.target),
    baselineFingerprint: input.baselineFingerprint ?? null,
    lastFingerprint: null,
    tier: input.tier,
    alertUrl: input.alertUrl ?? null,
    createdAt: Date.now(),
    lastCheckedAt: null,
    lastAlertedFingerprint: null,
  };
  STORE.set(token, m);
  BY_TARGET.set(input.target, token);
  return m;
}

export function getMonitor(token: string): Monitor | null {
  return STORE.get(token) ?? null;
}

export function listMonitors(): Monitor[] {
  return [...STORE.values()];
}

export function deleteMonitor(token: string): boolean {
  const m = STORE.get(token);
  if (!m) return false;
  STORE.delete(token);
  BY_TARGET.delete(m.target);
  return true;
}

export interface RecheckResult {
  token: string;
  target: string;
  drifted: boolean;
  /** null when the surface could not be re-observed. */
  fingerprint: string | null;
  baseline: string | null;
  state: string;
  grade: string;
}

/**
 * Re-observe one monitored surface. Unreachable is not drift — it is an
 * outage, and alerting on it would train people to ignore the signal.
 */
export async function recheck(token: string): Promise<RecheckResult | null> {
  const m = STORE.get(token);
  if (!m) return null;
  if (!scanner) throw new Error("scanner not configured — call configureScanner first");

  try {
    const report = await scanner(m.target);
    const fp = report.fingerprint ?? null;
    const drifted =
      fp !== null && m.baselineFingerprint !== null && m.baselineFingerprint !== fp;

    m.lastCheckedAt = Date.now();
    if (fp) {
      if (m.baselineFingerprint === null) m.baselineFingerprint = fp;
      m.lastFingerprint = fp;
    }

    return {
      token,
      target: m.target,
      drifted,
      fingerprint: fp,
      baseline: m.baselineFingerprint,
      state: report.state,
      grade: report.grade,
    };
  } catch {
    m.lastCheckedAt = Date.now();
    return {
      token,
      target: m.target,
      drifted: false,
      fingerprint: null,
      baseline: m.baselineFingerprint,
      state: "unreachable",
      grade: "—",
    };
  }
}

export interface Alert {
  monitorToken: string;
  target: string;
  baseline: string | null;
  observed: string | null;
  state: string;
  grade: string;
  at: number;
}

/**
 * Deliver a drift alert. Best-effort: a failed delivery must never lose the
 * monitor or stall the scheduler — the next run tries again.
 */
export async function dispatchAlert(
  m: Monitor,
  result: RecheckResult,
): Promise<boolean> {
  if (!m.alertUrl) return false;
  const alert: Alert = {
    monitorToken: m.token,
    target: m.target,
    baseline: result.baseline,
    observed: result.fingerprint,
    state: result.state,
    grade: result.grade,
    at: Date.now(),
  };
  try {
    const res = await fetch(m.alertUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(alert),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** De-duplicate: alert only on a transition, not on every confirming run. */
export function shouldAlert(m: Monitor, result: RecheckResult): boolean {
  if (!result.drifted) return false;
  return m.lastAlertedFingerprint !== result.fingerprint;
}

function hostOf(target: string): string {
  try {
    return new URL(target).host;
  } catch {
    return target;
  }
}

export function __resetMonitorsForTests(): void {
  STORE.clear();
  BY_TARGET.clear();
}
