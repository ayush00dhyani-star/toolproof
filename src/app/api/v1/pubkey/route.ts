import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS = { "access-control-allow-origin": "*" };

export async function GET() {
  const pem = process.env.TOOLPROOF_PUBLIC_KEY;
  return new NextResponse(pem ?? "unconfigured", {
    headers: { "content-type": "text/plain; charset=utf-8", ...CORS },
  });
}
