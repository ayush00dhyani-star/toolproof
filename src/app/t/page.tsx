import type { Metadata } from "next";
import Link from "next/link";
import GradeRing from "@/components/GradeRing";
import ShareRow from "@/components/ShareRow";
import { TargetError } from "@/lib/net";
import { scanTarget } from "@/lib/scan";
import { SEV_COLOR } from "@/lib/score";
import type { ScanKind } from "@/lib/types";

export const dynamic = "force-dynamic";

function hostOf(raw: string) {
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; kind?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const target = sp.target ?? "";
  if (!target) return { title: "Trust card" };

  const kind: ScanKind =
    sp.kind === "mcp" || sp.kind === "api" ? sp.kind : "auto";
  let host = hostOf(target);
  let grade = "—";
  try {
    const r = await scanTarget(target, kind); // cached; page body reuses it
    host = r.host;
    grade = r.grade;
  } catch {
    /* invalid target — host stays as typed, grade stays "—" */
  }

  return {
    title: { absolute: `${host} — ${grade} on Toolproof` },
    openGraph: {
      images: [`/api/v1/og?target=${encodeURIComponent(target)}&kind=${kind}`],
    },
  };
}

export default async function TrustPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const target = sp.target ?? "";

  if (!target) {
    return (
      <Shell>
        <div className="card p-8 text-center">
          <div className="lbl mb-3">trust card</div>
          <p className="text-dim">
            No target given. Run a scan from the{" "}
            <Link href="/" className="text-amber underline-offset-4 hover:underline">
              scan box on the front page
            </Link>
            .
          </p>
        </div>
      </Shell>
    );
  }

  const kind: ScanKind = sp.kind === "mcp" || sp.kind === "api" ? sp.kind : "auto";

  let report;
  try {
    report = await scanTarget(target, kind);
  } catch (e) {
    const msg =
      e instanceof TargetError
        ? e.message
        : "scan failed — the target did not respond coherently";
    return (
      <Shell>
        <div className="card p-8">
          <div className="lbl mb-3">scan rejected</div>
          <div className="text-[13px] text-bad">{msg}</div>
          <Link
            href="/"
            className="mt-6 inline-block text-[12px] text-amber underline-offset-4 hover:underline"
          >
            ← back
          </Link>
        </div>
      </Shell>
    );
  }

  const q = `target=${encodeURIComponent(report.target)}&kind=${kind}`;

  return (
    <Shell>
      <div className="fadeup">
        {/* header */}
        <div className="flex flex-wrap items-start gap-6">
          <GradeRing score={report.score} grade={report.grade} state={report.state} />
          <div className="min-w-0 flex-1">
            <h1 className="h-display text-2xl sm:text-3xl font-bold tracking-tight break-all">
              {report.host}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] tracking-[0.16em] uppercase">
              <span className="rounded border border-line px-2 py-1 text-dim">{report.kind}</span>
              <span
                className={`rounded px-2 py-1 ${
                  report.state === "verified"
                    ? "bg-good/15 text-good border border-good/30"
                    : "border border-line text-faint"
                }`}
              >
                {report.state}
              </span>
              <span className="rounded border border-line px-2 py-1 text-faint">
                {new Date(report.scannedAt).toISOString().replace("T", " ").slice(0, 19)}Z
              </span>
              <span className="rounded border border-line px-2 py-1 text-faint">{report.durationMs}ms</span>
            </div>
            <p className="mt-4 max-w-2xl text-[13px] leading-6 text-dim">{report.summary}</p>
          </div>
        </div>

        {/* share */}
        <ShareRow target={report.target} kind={kind} host={report.host} grade={report.grade} />

        {/* positives */}
        {report.positives.length > 0 && (
          <div className="mt-8">
            <div className="lbl mb-3">what checked out</div>
            <ul className="space-y-2">
              {report.positives.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-dim">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-good shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* findings */}
        <div className="mt-10">
          <div className="lbl mb-3">
            findings · {report.findings.length}
          </div>
          {report.findings.length === 0 ? (
            <div className="card p-6 text-[13px] text-dim">
              Nothing flagged. Every rule in the catalog came back clean — the
              surface said only what a human could read and approve.
            </div>
          ) : (
            <div className="space-y-3">
              {report.findings.map((f, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg"
                      style={{ background: SEV_COLOR[f.sev] }}
                    >
                      {f.sev}
                    </span>
                    <span className="text-[11px] text-dim">{f.rule}</span>
                    <span className="text-[13px] font-bold">{f.title}</span>
                  </div>
                  <div className="mt-3 text-[11px] text-faint break-all">{f.where}</div>
                  {f.evidence && (
                    <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-bg px-4 py-3 text-[11.5px] leading-6 text-dim">
                      {f.evidence}
                    </pre>
                  )}
                  <p className="mt-3 text-[12px] leading-6 text-dim">{f.why}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* passport + consume */}
        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <div className="card overflow-hidden">
            <div className="tape h-1.5" />
            <div className="px-5 py-4 lbl">passport · canonical JSON</div>
            <pre className="px-5 pb-5 text-[11px] leading-6 overflow-x-auto text-dim">{JSON.stringify(
              {
                v: report.v,
                kind: report.kind,
                target: report.target,
                host: report.host,
                state: report.state,
                scannedAt: report.scannedAt,
                score: report.score,
                grade: report.grade,
                summary: report.summary,
                findingCounts: report.findingCounts,
                ruleIds: [...new Set(report.findings.map((f) => f.rule))].sort(),
                positives: report.positives,
                scanner: { name: "toolproof", version: "0.1.0" },
              },
              null,
              2,
            )}</pre>
          </div>
          <div className="space-y-6">
            <div className="card p-5">
              <div className="lbl mb-3">consume as JSON</div>
              <pre className="overflow-x-auto rounded-lg border border-line bg-bg px-4 py-3 text-[11.5px] leading-6 text-dim">{`curl "${"{origin}"}/api/v1/verify?${q.replace(/&/g, "\\&")}" | jq`}</pre>
              <p className="mt-3 text-[12px] leading-6 text-dim">
                The verify endpoint returns the passport above plus an
                ed25519 signature over its canonical form. Verify offline with
                the public key.
              </p>
              <Link href="/docs" className="mt-3 inline-block text-[12px] text-amber underline-offset-4 hover:underline">
                Verification code →
              </Link>
            </div>
            <div className="card p-5">
              <div className="lbl mb-3">badge</div>
              <div className="rounded-lg border border-line bg-bg p-4 overflow-x-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/v1/badge?${q}`} alt="toolproof grade badge" />
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-bg px-4 py-3 text-[11.5px] leading-6 text-dim">{`<img src="${"{origin}"}/api/v1/badge?${q.replace(/&/g, "\\&")}">`}</pre>
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-6 text-[12px]">
          <Link href="/" className="text-amber underline-offset-4 hover:underline">← scan something else</Link>
          <a
            href={`/t?${q}&rescan=${Date.now()}`}
            className="text-dim underline-offset-4 hover:underline"
          >
            re-scan
          </a>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <div className="border-b border-line bg-bg/85 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 text-amber">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <span className="text-[13px] font-bold tracking-[0.3em]">TOOLPROOF</span>
          </Link>
          <Link
            href="/docs"
            className="ml-auto text-[11px] tracking-[0.18em] uppercase text-dim hover:text-ink"
          >
            Docs
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-5 py-12">{children}</div>
      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-5xl px-5 text-[11px] text-faint">
          Toolproof v0.1 — point-in-time scan. A passing grade is a receipt,
          not a guarantee.
        </div>
      </footer>
    </main>
  );
}
