import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Canary generator — mints a unique, tool-bound canary credential.
 *
 * Plant the returned fake key anywhere the tool (or its dependencies) can
 * read it. The token itself carries no beacon: detection is by lookup —
 * if the string ever appears in an agent transcript, a log, a paste site
 * or a partner's telemetry, the tool that saw it leaked it. The token
 * embeds the tool's host so the leaked copy identifies its source.
 *
 * Real-time beacon alerting (a phone-home endpoint that pages you) ships
 * in v1.1 — this endpoint is the standard-compliant generation half.
 */
export async function GET(req: NextRequest) {
  const tool = (req.nextUrl.searchParams.get("tool") ?? "").trim();
  if (!tool)
    return NextResponse.json(
      { error: "missing ?tool= (the host the canary protects)" },
      { status: 400, headers: CORS },
    );

  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const host = tool
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9.-]/gi, "")
    .toLowerCase()
    .slice(0, 40);
  const body = createHash("sha256")
    .update(`${id}:${host}:${Date.now()}`)
    .digest("hex")
    .slice(0, 32);

  // shaped like a cloud secret — the thing a prompt-injected agent grabs
  const token = `tpc_${body}`;
  const marker = `TOOLPROOF-CANARY ${id} for ${host}`;

  return NextResponse.json(
    {
      tool: host || tool,
      id,
      token,
      marker,
      toolproofTxtLine: `Canary: ${token}`,
      howTo: [
        "1. Place the token where the tool can read it — an env var, a config value, a decoy note in the tool description.",
        "2. Record the toolproof.txt line in your /.well-known/toolproof.txt so scanners know a canary is planted.",
        "3. Detection is by lookup: search your logs, transcripts and any paste-site alerts for the token or marker string. If it shows up outside the tool, that copy identifies the tool it was stolen from.",
        "4. Rotate the canary like a real credential — regenerate when staff or infrastructure changes.",
      ],
    },
    { headers: CORS },
  );
}
