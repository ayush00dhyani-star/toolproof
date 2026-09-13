import type { Metadata } from "next";
import Link from "next/link";
import Watchlist from "@/components/Watchlist";
import { scanTarget } from "@/lib/scan";
import { SEEDS } from "@/lib/seeds";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "The safest and most flagged MCP servers and APIs — public pressure, one scan at a time.",
};

interface Row {
  target: string;
  host: string;
  kind: string;
  state: string;
  score: number;
  grade: string;
  critical: number;
  high: number;
  flagged: number;
}

function chipBg(grade: string, state: string) {
  if (state !== "verified") return "#a1a1aa";
  if (grade.startsWith("A")) return "#34d399";
  if (grade === "B") return "#ffb224";
  return "#ff5d5d";
}

export default async function LeaderboardPage() {
  const scanned = await Promise.all(
    SEEDS.map(async (s): Promise<Row | null> => {
      try {
        const r = await scanTarget(s.target, s.kind);
        if (r.state !== "verified") return null;
        return {
          target: r.target,
          host: r.host,
          kind: r.kind,
          state: r.state,
          score: r.score,
          grade: r.grade,
          critical: r.findingCounts.critical,
          high: r.findingCounts.high,
          flagged: r.findingCounts.critical + r.findingCounts.high + r.findingCounts.medium + r.findingCounts.low,
        };
      } catch {
        return null;
      }
    }),
  );

  const rows = scanned.filter((r): r is Row => r !== null);
  const safest = [...rows].sort((a, b) => b.score - a.score).slice(0, 8);
  const mostFlagged = [...rows]
    .filter((r) => r.flagged > 0)
    .sort((a, b) => b.critical * 100 + b.high * 10 - (a.critical * 100 + a.high * 10))
    .slice(0, 8);

  return (
    <main className="min-h-screen">
      <div className="border-b border-hair sticky top-0 z-40 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeDasharray="1.9 1.24" />
              <circle cx="12" cy="12" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8.7 12.3 11 14.6 15.4 9.8" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <span className="ml-4 lbl">leaderboard</span>
          <Link href="/" className="ml-auto text-[13px] text-dim hover:text-ink transition-colors">
            ← scan
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-12 space-y-12">
        <section>
          <div className="lbl mb-3">public pressure, one scan at a time</div>
          <h1 className="text-2xl font-semibold leading-snug">
            The safest and most flagged tools,
            <br />
            ranked in the open.
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-7 text-dim">
            Rankings come from the same scans anyone can reproduce — no
            editorial, no pay-to-rank. Tool vendors who clean up move up;
            vendors who ship hidden instructions move down.
          </p>
        </section>

        <section>
          <div className="lbl mb-3">safest · verified &amp; clean</div>
          {safest.length === 0 ? (
            <div className="card p-5 text-[13px] text-dim">
              No verified tools yet.
            </div>
          ) : (
            <div className="card divide-y divide-hair overflow-hidden">
              {safest.map((r, i) => (
                <Link
                  key={r.target}
                  href={`/t?target=${encodeURIComponent(r.target)}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-panel2"
                >
                  <span className="mono w-6 text-[13px] text-faint">{i + 1}</span>
                  <span
                    className="mono flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold text-chip"
                    style={{ background: chipBg(r.grade, r.state) }}
                  >
                    {r.grade}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                    {r.host}
                    <span className="ml-2 text-[11px] text-faint">{r.kind}</span>
                  </span>
                  <span className="mono text-[12px] text-dim">{r.score}/100</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="lbl mb-3">most flagged · handle with care</div>
          {mostFlagged.length === 0 ? (
            <div className="card p-5 text-[13px] text-dim">
              Nothing flagged in the registry. Lower your guard anyway —
              absence of findings is not presence of safety.
            </div>
          ) : (
            <div className="card divide-y divide-hair overflow-hidden">
              {mostFlagged.map((r, i) => (
                <Link
                  key={r.target}
                  href={`/t?target=${encodeURIComponent(r.target)}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-panel2"
                >
                  <span className="mono w-6 text-[13px] text-faint">{i + 1}</span>
                  <span
                    className="mono flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold text-chip"
                    style={{ background: chipBg(r.grade, r.state) }}
                  >
                    {r.grade}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                    {r.host}
                    <span className="ml-2 text-[11px] text-faint">
                      {r.flagged} flagged{r.critical ? ` · ${r.critical} critical` : ""}
                    </span>
                  </span>
                  <span className="mono text-[12px] text-dim">{r.score}/100</span>
                </Link>
              ))}
            </div>
          )}
          <p className="mt-4 text-[12.5px] text-faint">
            Rankings cover the public registry (starters above; grows with
            verified submissions). A flagged tool is a reason to look, not a
            verdict on intent — read the card.
          </p>
        </section>

        <section>
          <div className="lbl mb-3">your watchlist · change monitoring</div>
          <Watchlist />
          <p className="mt-3 text-[12.5px] text-faint">
            Pinned tools are re-checked every time you open this page — the
            tool&apos;s text fingerprint is compared against the one from your
            last scan. For around-the-clock alerting, run the same check from
            CI: the{" "}
            <Link href="/docs#monitoring" className="text-amber underline-offset-4 hover:underline">
              monitoring recipe
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
