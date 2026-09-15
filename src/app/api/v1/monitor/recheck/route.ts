import { NextRequest, NextResponse } from "next/server";
import {
  listMonitors,
  recheck,
  dispatchAlert,
  shouldAlert,
  configureScanner,
} from "@/lib/billing/monitor";
import { scanTarget } from "@/lib/scan";
import { buildManifest } from "@/lib/lock/manifest";

// A ScanReport carries no fingerprint — the canonical hash of the capability
// surface lives on the manifest built from it. The monitor compares pinned
// baseline against that hash, so the scanner must return the manifest.
configureScanner(async (target) => {
  const report = await scanTarget(target);
  const manifest = buildManifest(report);
  return {
    fingerprint: manifest.fingerprint,
    state: manifest.state,
    grade: manifest.grade,
  };
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * The scheduler tick: re-observe every monitored surface and alert on drift.
 *
 * In production this is called by a cron (Vercel Cron or GitHub Actions) on
 * each tier's recheck interval. It is idempotent — running it twice in a row
 * produces the same alerts, because an alert fires only on the transition.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization") ?? "";
  const expected = process.env.TOOLPROOF_CRON_SECRET;
  if (expected && secret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  }

  const checked: { target: string; drifted: boolean; alerted: boolean }[] = [];
  for (const m of listMonitors()) {
    const result = await recheck(m.token);
    if (!result) continue;
    const alerted = shouldAlert(m, result);
    if (alerted) {
      await dispatchAlert(m, result);
      m.lastAlertedFingerprint = result.fingerprint;
    }
    checked.push({ target: m.target, drifted: result.drifted, alerted });
  }

  return NextResponse.json(
    { checked, at: new Date().toISOString() },
    { headers: { ...CORS, "cache-control": "no-store" } },
  );
}
