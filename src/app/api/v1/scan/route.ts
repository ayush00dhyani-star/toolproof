import { NextRequest, NextResponse } from "next/server";
import { record } from "@/lib/feed";
import { TargetError } from "@/lib/net";
import { scanTarget, getCached } from "@/lib/scan";
import type { ScanKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function kindParam(v: string | null): ScanKind {
  return v === "mcp" || v === "api" ? v : "auto";
}

async function run(target: string | null, kind: string | null) {
  if (!target)
    return NextResponse.json(
      { error: "missing ?target= (an MCP endpoint or API base URL)" },
      { status: 400, headers: CORS },
    );
  try {
    const k = kindParam(kind);
    // Feed the Ledger only on fresh scans: if getCached hits, this
    // response is a replay, not a new verdict.
    const fresh = getCached(target, k) === null;
    const report = await scanTarget(target, k);
    if (fresh)
      record({
        host: report.host,
        target: report.target,
        kind: report.kind,
        state: report.state,
        score: report.score,
        grade: report.grade,
      });
    return NextResponse.json(
      { report },
      {
        headers: {
          ...CORS,
          "cache-control": "public, s-maxage=120, stale-while-revalidate=600",
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

export async function GET(req: NextRequest) {
  return run(
    req.nextUrl.searchParams.get("target"),
    req.nextUrl.searchParams.get("kind"),
  );
}

export async function POST(req: NextRequest) {
  let body: { target?: string; kind?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body falls through to 400 */
  }
  return run(body.target ?? null, body.kind ?? null);
}
