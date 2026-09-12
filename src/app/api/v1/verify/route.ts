import { NextRequest, NextResponse } from "next/server";
import { record } from "@/lib/feed";
import { passportOf } from "@/lib/passport";
import { TargetError } from "@/lib/net";
import { scanTarget, getCached } from "@/lib/scan";
import { signPassport } from "@/lib/sign";
import type { ScanKind } from "@/lib/types";

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
    // Feed the Ledger only on fresh scans: a cache hit is a replay of an
    // already-recorded verdict, not a new one.
    const fresh = getCached(target, kind) === null;
    const report = await scanTarget(target, kind);
    if (fresh)
      record({
        host: report.host,
        target: report.target,
        kind: report.kind,
        state: report.state,
        score: report.score,
        grade: report.grade,
      });
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
