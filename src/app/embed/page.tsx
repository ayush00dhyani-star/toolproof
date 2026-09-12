import type { Metadata } from "next";
import GradeRing from "@/components/GradeRing";
import { TargetError } from "@/lib/net";
import { scanTarget } from "@/lib/scan";
import type { ScanKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Live verdict card",
  robots: { index: false },
};

function Seal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-2">
      <div className="card p-5 w-[320px] text-center">{children}</div>
    </main>
  );
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const target = sp.target ?? "";

  if (!target) {
    return (
      <Panel>
        <div className="lbl mb-3">toolproof</div>
        <p className="text-[12px] leading-6 text-dim">
          no target given — add{" "}
          <span className="text-ink">?target=</span> to the embed URL
        </p>
      </Panel>
    );
  }

  const kind: ScanKind =
    sp.kind === "mcp" || sp.kind === "api" ? sp.kind : "auto";

  let report;
  try {
    report = await scanTarget(target, kind);
  } catch (e) {
    const msg =
      e instanceof TargetError
        ? e.message
        : "the target did not respond coherently";
    return (
      <Panel>
        <div className="lbl mb-3">toolproof</div>
        <div className="text-[13px] text-bad">invalid target</div>
        <div className="mt-2 text-[11px] leading-5 text-faint break-all">
          {msg}
        </div>
      </Panel>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-2">
      <div className="card w-[320px] h-[220px] p-4 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Seal className="h-4 w-4 text-amber shrink-0" />
          <span className="text-[13px] font-bold truncate">{report.host}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <GradeRing
            score={report.score}
            grade={report.grade}
            state={report.state}
            size={96}
          />
        </div>
        <div className="text-[11px] leading-5 text-dim truncate">
          {report.summary}
        </div>
        <a
          href={`/t?target=${encodeURIComponent(report.target)}&kind=${kind}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-[11px] text-amber underline-offset-4 hover:underline shrink-0"
        >
          full card ↗
        </a>
      </div>
    </main>
  );
}
