import { NextResponse } from "next/server";
import { snapshot } from "@/lib/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Live verdict feed — in-memory on this node, so it must never be cached
// for long. s-maxage=5 keeps the ledger feeling live at the edge.
export async function GET() {
  return NextResponse.json(snapshot(), {
    headers: { ...CORS, "cache-control": "public, s-maxage=5" },
  });
}
