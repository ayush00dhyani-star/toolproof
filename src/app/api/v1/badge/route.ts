import { NextRequest } from "next/server";
import { scanTarget } from "@/lib/scan";
import { gradeColor } from "@/lib/score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target") ?? "";
  const style = req.nextUrl.searchParams.get("style") ?? "grade";
  let grade = "—";
  let label = "UNVERIFIED";
  let color = "#5c6167";
  let host = target.replace(/^https?:\/\//i, "").slice(0, 30) || "no target";

  if (target) {
    try {
      const r = await scanTarget(target);
      grade = r.grade;
      host = r.host.slice(0, 30);
      if (r.state === "verified") {
        label = "VERIFIED";
        color = gradeColor(r.grade);
      } else if (r.state === "opted-out") {
        label = "OPTED OUT";
      }
    } catch {
      /* keep unverified defaults */
    }
  }

  const svg =
    style === "flat"
      ? // Flat: one rounded pill — seal, TOOLPROOF, grade · state inline.
        `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" role="img" aria-label="toolproof: ${esc(label)}">
  <rect width="240" height="64" rx="12" fill="#0b0c0e"/>
  <rect x="0.5" y="0.5" width="239" height="63" rx="11.5" fill="none" stroke="#23262b"/>
  <circle cx="28" cy="32" r="10" fill="none" stroke="${color}" stroke-width="3"/>
  <circle cx="28" cy="32" r="3" fill="${color}"/>
  <text x="46" y="36" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="9" letter-spacing="3" fill="#9ba0a6">TOOLPROOF</text>
  <text x="130" y="36" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12" font-weight="700" fill="${color}">${esc(grade)} · ${esc(label)}</text>
</svg>`
      : // Grade (default): label block left, grade block right.
        `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="64" role="img" aria-label="toolproof: ${esc(label)}">
  <rect width="300" height="64" rx="10" fill="#0b0c0e"/>
  <rect x="0.5" y="0.5" width="299" height="63" rx="9.5" fill="none" stroke="#23262b"/>
  <circle cx="28" cy="32" r="10" fill="none" stroke="${color}" stroke-width="3"/>
  <circle cx="28" cy="32" r="3" fill="${color}"/>
  <text x="48" y="24" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="9" letter-spacing="3" fill="#9ba0a6">TOOLPROOF</text>
  <text x="48" y="44" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12" fill="#e8e6df">${esc(host)}</text>
  <rect x="232" y="12" width="56" height="40" rx="7" fill="${color}"/>
  <text x="260" y="38" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="18" font-weight="700" fill="#0b0c0e">${esc(grade)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, s-maxage=600, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
    },
  });
}
