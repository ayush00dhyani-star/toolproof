import type { Metadata } from "next";
import Link from "next/link";
import Proofmark from "@/components/Proofmark";
import { scanTarget } from "@/lib/scan";
import { SEEDS } from "@/lib/seeds";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "State of MCP tool safety",
  description:
    "What Toolproof found scanning the most-used MCP servers: grade distribution, hidden-instruction rates, exposed secrets and unsafe defaults, with the evidence to cite.",
  alternates: { canonical: "/report" },
};

interface Stat {
  scanned: number;
  verified: number;
  clean: number;
  flagged: number;
  critical: number;
  high: number;
  aOrBetter: number;
  instructionsHidden: number;
  secretsExposed: number;
  noAuth: number;
  byGrade: Record<string, number>;
}

async function compute(): Promise<Stat> {
  const reports = await Promise.all(
    SEEDS.map(async (s) => {
      try {
        return await scanTarget(s.target, s.kind);
      } catch {
        return null;
      }
    }),
  );
  const rs = reports.filter((r): r is NonNullable<typeof r> => r !== null);

  const byGrade: Record<string, number> = {};
  for (const r of rs) byGrade[r.grade] = (byGrade[r.grade] ?? 0) + 1;

  const ruleHits = new Set<string>();
  for (const r of rs) for (const f of r.findings) ruleHits.add(f.rule);

  return {
    scanned: rs.length,
    verified: rs.filter((r) => r.state === "verified").length,
    clean: rs.filter((r) => r.findings.length === 0).length,
    flagged: rs.filter((r) => r.findings.length > 0).length,
    critical: rs.reduce((n, r) => n + r.findingCounts.critical, 0),
    high: rs.reduce((n, r) => n + r.findingCounts.high, 0),
    aOrBetter: rs.filter((r) => r.grade.startsWith("A")).length,
    instructionsHidden: rs.filter((r) =>
      r.findings.some((f) => f.rule === "TP-101" || f.rule === "TP-102"),
    ).length,
    secretsExposed: rs.filter((r) =>
      r.findings.some((f) => f.rule === "TP-104"),
    ).length,
    noAuth: rs.filter((r) =>
      r.findings.some((f) => f.rule === "TP-202"),
    ).length,
    byGrade,
  };
};

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export default async function ReportPage() {
  const s = await compute();
  const graded = s.scanned;

  return (
    <main className="min-h-screen">
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <span className="ml-4 lbl">field report</span>
          <Link
            href="/"
            className="ml-auto text-[13px] text-dim transition-colors hover:text-ink"
          >
            ← scan a tool
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <div className="lbl mb-4">state of mcp tool safety</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[36px]">
          We scanned the tools your agent already trusts.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-dim">
          Every number below comes from a scan anyone can reproduce with a
          keyless API call. No editorial, no sample selection, no vendor
          sponsorship — this is the point: a trust layer paid by nobody it
          scans is the only kind worth having.
        </p>

        {/* headline stats */}
        <section className="mt-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: s.scanned, l: "servers scanned" },
              { k: s.verified, l: `verified (${pct(s.verified, s.scanned)})` },
              { k: s.critical + s.high, l: "critical + high findings" },
              { k: pct(s.aOrBetter, graded), l: "graded A or better" },
            ].map((x) => (
              <div key={x.l} className="card px-4 py-4">
                <div className="text-2xl font-semibold text-ink">{x.k}</div>
                <div className="mt-1 text-[11.5px] leading-5 text-faint">
                  {x.l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* the finding that matters */}
        <section className="mt-12">
          <div className="lbl mb-4">what we found</div>
          <div className="card px-5 py-6">
            <p className="text-[14px] leading-7 text-dim">
              <strong className="text-ink">
                {pct(s.instructionsHidden, s.scanned)}
              </strong>{" "}
              of scanned servers carry hidden characters or instructions in the
              text your model reads — the exact attack surface Toolproof was
              built for. A human reviewing the same screen sees nothing; the
              model obeys every word.
            </p>
            <div className="mt-6 divide-y divide-hair border-t border-hair">
              {[
                {
                  rule: "TP-101 / TP-102",
                  n: s.instructionsHidden,
                  what: "hidden characters or instructions in tool text",
                  why: "smuggled instructions the model reads but a human cannot see",
                },
                {
                  rule: "TP-104",
                  n: s.secretsExposed,
                  what: "exposed credentials in plain text",
                  why: "a key sitting in a description is already burned",
                },
                {
                  rule: "TP-202",
                  n: s.noAuth,
                  what: "tools touching data with no authentication",
                  why: "public by accident, not by design",
                },
              ].map((row) => (
                <div key={row.rule} className="flex flex-wrap gap-3 py-3.5">
                  <span className="mono w-24 shrink-0 text-[11.5px] text-amber">
                    {row.rule}
                  </span>
                  <span className="mono w-8 shrink-0 text-[13px] font-semibold text-ink">
                    {row.n}
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] leading-5 text-dim">
                    {row.what}
                    <span className="block text-faint">{row.why}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* grade distribution */}
        <section className="mt-12">
          <div className="lbl mb-4">grade distribution</div>
          <div className="card px-5 py-6 space-y-2.5">
            {["A+", "A", "A-", "B", "B+", "C", "D", "F", "—"]
              .filter((g) => s.byGrade[g] > 0)
              .map((g) => {
                const n = s.byGrade[g];
                return (
                  <div key={g} className="flex items-center gap-3">
                    <span className="mono w-8 text-[12.5px] text-ink">{g}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-sm bg-black/20">
                      <div
                        className="h-full rounded-sm bg-amber/70"
                        style={{ width: `${(n / s.scanned) * 100}%` }}
                      />
                    </div>
                    <span className="mono w-12 text-right text-[12px] text-dim">
                      {n} ({pct(n, s.scanned)})
                    </span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* cite it */}
        <section className="mt-12">
          <div className="lbl mb-4">cite this</div>
          <p className="max-w-2xl text-[13px] leading-7 text-dim">
            Every figure recomputes on request from live scans, so a citation
            stays honest. The methodology is the rule catalog — open source,
            inspectable, and the same code that produced these numbers.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-[12.5px]">
            <Link
              href="/docs"
              className="text-amber underline-offset-4 hover:underline"
            >
              the rule catalog →
            </Link>
            <Link
              href="/leaderboard"
              className="text-amber underline-offset-4 hover:underline"
            >
              reproduce the rankings →
            </Link>
            <a
              href="https://github.com/ayush00dhyani-star/toolproof"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber underline-offset-4 hover:underline"
            >
              the scanner is open source →
            </a>
          </div>
        </section>

        <footer className="mt-14 border-t border-hair pt-6 text-[12px] text-faint">
          A grade is a receipt, not a guarantee. These figures describe the
          public, model-visible surface of each server at scan time and nothing
          about its runtime behaviour.
        </footer>
      </article>
    </main>
  );
}
