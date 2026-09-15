/**
 * Subscription tiers — the commercial vehicle.
 *
 * Design rule from the approved spec: scans stay free forever. What a team
 * pays for is *continuity* — monitoring, alerting and the control plane —
 * not the verdict itself. Nothing here can gate a scan or a signature;
 * a free user's receipt is every bit as verifiable as a paying one's.
 */
export type TierName = "free" | "team" | "enterprise";

export interface Tier {
  name: TierName;
  label: string;
  /** Monthly price in USD cents; 0 means no self-serve checkout. */
  priceCents: number;
  /** Number of monitored capability surfaces included. */
  monitoredTargets: number;
  /** How often the scheduler re-observes each monitored surface. */
  recheckHours: number;
  features: string[];
}

export const TIERS: Record<TierName, Tier> = {
  free: {
    name: "free",
    label: "Free",
    priceCents: 0,
    monitoredTargets: 0,
    recheckHours: 0,
    features: [
      "Unlimited trust cards & grades",
      "Watchlist with diff-on-change alerts",
      "check_tool MCP server",
      "toolproof-lock CLI — lockfile + CI check, MIT",
      "Signed ed25519 passports on every verdict",
      "Local evidence trail + browser verifier",
    ],
  },
  team: {
    name: "team",
    label: "Team",
    priceCents: 4900,
    monitoredTargets: 25,
    recheckHours: 6,
    features: [
      "Hosted monitoring of 25 capability surfaces",
      "Webhook + email alerts within 6h of drift",
      "Shared Lock policy across every repo",
      "Named approvers + review workflow",
      "Hosted evidence export for auditors",
      "Badge + gate enforcement across all repos",
    ],
  },
  enterprise: {
    name: "enterprise",
    label: "Enterprise",
    priceCents: 0, // custom — contact sales
    monitoredTargets: -1, // unlimited
    recheckHours: 1,
    features: [
      "Self-hosted scanner & signing keys",
      "SSO / SAML, RBAC, org audit trails",
      "SIEM streaming of signed verdicts",
      "Vendor due-diligence reports on demand",
      "SLA + security review support",
    ],
  },
};

export const SELF_SERVE_TIERS = ["team"] as const;

export function tierForName(name: string): Tier | null {
  return TIERS[name as TierName] ?? null;
}
