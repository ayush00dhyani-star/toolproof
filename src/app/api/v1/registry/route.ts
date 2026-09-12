import { NextResponse } from "next/server";
import { TargetError } from "@/lib/net";
import { scanTarget } from "@/lib/scan";
import { SEEDS } from "@/lib/seeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

let cache: { at: number; body: unknown } | null = null;
const TTL = 15 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL)
    return NextResponse.json(cache.body, { headers: CORS });

  const results = await Promise.all(
    SEEDS.map(async (s) => {
      try {
        const r = await scanTarget(s.target, s.kind);
        return {
          label: s.label,
          note: s.note,
          target: r.target,
          host: r.host,
          kind: r.kind,
          state: r.state,
          score: r.score,
          grade: r.grade,
        };
      } catch (e) {
        return {
          label: s.label,
          note: s.note,
          target: s.target,
          host: null,
          kind: "unknown",
          state: "unverified",
          score: null,
          grade: "—",
          error:
            e instanceof TargetError || e instanceof Error
              ? e.message
              : "scan failed",
        };
      }
    }),
  );

  const body = { generatedAt: new Date().toISOString(), results };
  cache = { at: Date.now(), body };
  return NextResponse.json(body, { headers: CORS });
}
