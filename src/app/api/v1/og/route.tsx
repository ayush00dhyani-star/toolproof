import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { TargetError } from "@/lib/net";
import { scanTarget } from "@/lib/scan";
import { gradeColor } from "@/lib/score";
import type { ScanKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const CACHE_HEADERS = {
  "cache-control": "public, s-maxage=21600, stale-while-revalidate=86400",
};

const SIZE = { width: 1200, height: 630 };

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function hostOf(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target") ?? "";
  const kindRaw = req.nextUrl.searchParams.get("kind");
  const kind: ScanKind =
    kindRaw === "mcp" || kindRaw === "api" ? kindRaw : "auto";

  let host = hostOf(target) || "no target";
  let label = "UNVERIFIED";
  let sub = "";
  let color = "#5c6167";
  let summary = "No MCP or OpenAPI surface could be verified for this target.";

  try {
    const r = await scanTarget(target, kind); // cached, 10min TTL
    host = r.host || hostOf(target) || "no target";
    summary = truncate(r.summary, 110);
    if (r.state === "verified") {
      label = r.grade;
      sub = `${r.score}/100`;
      color = gradeColor(r.grade);
    } else if (r.state === "opted-out") {
      label = "OPTED OUT";
    }
  } catch (e) {
    if (e instanceof TargetError) {
      // Invalid/private target → render the "invalid target" variant with a
      // 200 (social crawlers need a renderable image even for bad targets).
      label = "INVALID TARGET";
      summary = truncate(e.message, 110);
      host = hostOf(target) || "no target";
    } else {
      summary = "scan failed — the target did not respond coherently";
    }
  }

  const verified = sub !== "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0c0e",
          color: "#e8e6df",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 14,
            background: "#ffb224",
            display: "flex",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexGrow: 1,
            padding: "56px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 12,
              color: "#9ba0a6",
            }}
          >
            TOOLPROOF
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "sans-serif",
                  fontWeight: 800,
                  fontSize: 68,
                  lineHeight: 1.15,
                  letterSpacing: -1,
                  wordBreak: "break-all",
                }}
              >
                {truncate(host, 48)}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  lineHeight: 1.5,
                  color: "#9ba0a6",
                  marginTop: 24,
                }}
              >
                {summary}
              </div>
            </div>
            {verified ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 240,
                  height: 200,
                  borderRadius: 24,
                  background: color,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontFamily: "sans-serif",
                    fontWeight: 800,
                    fontSize: 96,
                    color: "#0b0c0e",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    color: "#0b0c0e",
                    marginTop: 4,
                  }}
                >
                  {sub}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 240,
                  height: 200,
                  borderRadius: 24,
                  background: "#121417",
                  border: "3px solid #23262b",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    letterSpacing: 3,
                    color: "#5c6167",
                    textAlign: "center",
                  }}
                >
                  {label}
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 2,
              color: "#5c6167",
            }}
          >
            toolproof-scan.vercel.app · signed trust passport
          </div>
        </div>
        <div
          style={{
            width: "100%",
            height: 14,
            background: "#ffb224",
            display: "flex",
            flexShrink: 0,
          }}
        />
      </div>
    ),
    {
      width: SIZE.width,
      height: SIZE.height,
      headers: { ...CORS, ...CACHE_HEADERS },
    },
  );
}
