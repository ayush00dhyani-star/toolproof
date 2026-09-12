import { NextRequest, NextResponse } from "next/server";
import { TargetError } from "@/lib/net";
import { scanTarget } from "@/lib/scan";
import { signPassport } from "@/lib/sign";
import type { ScanKind, ScanReport } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function passportOf(r: ScanReport): Record<string, unknown> {
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

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target");
  if (!target)
    return NextResponse.json(
      { error: "missing ?target=" },
      { status: 400, headers: CORS },
    );
  const kindRaw = req.nextUrl.searchParams.get("kind");
  const kind: ScanKind =
    kindRaw === "mcp" || kindRaw === "api" ? kindRaw : "auto";
  try {
    const report = await scanTarget(target, kind);
    const passport = passportOf(report);
    const { signature, keyId } = signPassport(passport);
    return NextResponse.json(
      { passport, signature, keyId, alg: "ed25519" },
      {
        headers: {
          ...CORS,
          "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (e) {
    if (e instanceof TargetError)
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: 400, headers: CORS },
      );
    return NextResponse.json(
      { error: "scan failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: CORS },
    );
  }
}
