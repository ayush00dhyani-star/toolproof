import { NextRequest, NextResponse } from "next/server";
import {
  registerMonitor,
  deleteMonitor,
  listMonitors,
} from "@/lib/billing/monitor";
import { TIERS } from "@/lib/billing/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** List the surfaces a capability token is monitoring. */
export async function GET(req: NextRequest) {
  const token = tokenOf(req);
  if (!token)
    return NextResponse.json(
      { error: "missing capability token (Authorization: Bearer <token>)" },
      { status: 401, headers: CORS },
    );

  const all = listMonitors().filter((m) => m.token === token);
  return NextResponse.json(
    {
      monitors: all.map((m) => ({
        target: m.target,
        host: m.host,
        baselineFingerprint: m.baselineFingerprint,
        lastFingerprint: m.lastFingerprint,
        lastCheckedAt: m.lastCheckedAt,
        tier: m.tier,
      })),
    },
    { headers: { ...CORS, "cache-control": "no-store" } },
  );
}

/**
 * Begin monitoring a capability surface. The customer pins the baseline with
 * `toolproof-lock lock` and passes its fingerprint here; we watch for drift.
 */
export async function POST(req: NextRequest) {
  const token = tokenOf(req);
  if (!token)
    return NextResponse.json(
      { error: "missing capability token (Authorization: Bearer <token>)" },
      { status: 401, headers: CORS },
    );

  try {
    const body = await req.json();
    const target = String(body?.target ?? "").trim();
    if (!target || !/^https?:\/\//i.test(target))
      return NextResponse.json(
        { error: "missing or invalid https target" },
        { status: 400, headers: CORS },
      );

    const tierName = String(body?.tier ?? "team");
    const tier = TIERS[tierName as keyof typeof TIERS];
    if (!tier || tier.monitoredTargets === 0)
      return NextResponse.json(
        { error: "this tier does not include monitoring" },
        { status: 403, headers: CORS },
      );

    const m = registerMonitor({
      target,
      tier: tier.name,
      alertUrl: body?.alertUrl ? String(body.alertUrl) : null,
      baselineFingerprint: body?.baselineFingerprint
        ? String(body.baselineFingerprint)
        : null,
    });

    return NextResponse.json(
      {
        target: m.target,
        host: m.host,
        baselineFingerprint: m.baselineFingerprint,
        recheckHours: tier.recheckHours,
        nextStep:
          "drift alerts POST to your alertUrl; re-observe manually with GET /api/v1/monitor/recheck?token=…",
      },
      {
        status: m.createdAt === Date.now() ? 201 : 200,
        headers: { ...CORS, "cache-control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "bad request body" },
      { status: 400, headers: CORS },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const token = tokenOf(req);
  if (!token)
    return NextResponse.json({ error: "missing capability token" }, { status: 401, headers: CORS });
  const ok = deleteMonitor(token);
  return NextResponse.json(
    { deleted: ok },
    { status: ok ? 200 : 404, headers: CORS },
  );
}

function tokenOf(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const q = req.nextUrl.searchParams.get("token");
  return q ?? null;
}
