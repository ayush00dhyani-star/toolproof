"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanKind, ScanReport } from "@/lib/types";
import { SEV_COLOR, gradeColor } from "@/lib/score";
import { recordMyVerdict } from "@/lib/my-ledger";
import ShareRow from "@/components/ShareRow";

type Phase = "idle" | "scanning" | "done" | "error";

// Staged progress labels, cycled every 700ms while a scan runs.
const STAGES = [
  "resolving host",
  "transport probe",
  "handshake",
  "tools/list",
  "rule engine",
  "signing",
];

const EXAMPLES: { label: string; target: string; kind: ScanKind }[] = [
  { label: "Context7", target: "mcp.context7.com/mcp", kind: "auto" },
  { label: "GitHub MCP", target: "api.githubcopilot.com/mcp", kind: "auto" },
  { label: "Petstore", target: "petstore3.swagger.io/api/v3", kind: "auto" },
  { label: "DeepWiki", target: "mcp.deepwiki.com/mcp", kind: "auto" },
];

const FINDINGS_SHOWN = 8;

export default function ScanBox() {
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<ScanKind>("auto");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scanStartRef = useRef(0);
  const busyRef = useRef(false);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Staged progress: cycle the stage label every 700ms and tick the
  // elapsed-ms counter every 100ms while scanning. The effect cleanup is
  // the single cleanup path — completion, error, reset and unmount all
  // leave the "scanning" phase, so no timers can leak.
  useEffect(() => {
    if (phase !== "scanning") return;
    scanStartRef.current = Date.now();
    const stageTimer = setInterval(
      () => setStageIdx((i) => (i + 1) % STAGES.length),
      700,
    );
    const tickTimer = setInterval(() => {
      setElapsed(Date.now() - scanStartRef.current);
    }, 100);
    return () => {
      clearInterval(stageTimer);
      clearInterval(tickTimer);
    };
  }, [phase]);

  const reset = useCallback(() => {
    runIdRef.current += 1; // stale in-flight responses become no-ops
    abortRef.current?.abort();
    busyRef.current = false;
    setTarget("");
    setReport(null);
    setError("");
    setPhase("idle");
  }, []);

  // "/" focuses the input from anywhere on the page (skipped while typing
  // in an input/textarea or with a modifier held); Escape clears the input
  // and resets to idle, aborting any in-flight scan.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (e.key === "/") {
        if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        reset();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset]);

  // Abort any in-flight scan when the box unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (overrideTarget?: string, overrideKind?: ScanKind) => {
      const t = (overrideTarget ?? target).trim();
      const k = overrideKind ?? kind;
      if (busyRef.current) return; // guard: no double-click races
      if (!t) {
        // A click with nothing pasted should teach, not dead-end.
        setError("Paste a tool link first — or tap an example below.");
        setPhase("error");
        return;
      }
      busyRef.current = true;
      const id = ++runIdRef.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setScanned(t);
      setStageIdx(0);
      setElapsed(0);
      setPhase("scanning");
      setError("");
      setReport(null);
      try {
        const res = await fetch(
          `/api/v1/scan?target=${encodeURIComponent(t)}&kind=${k}`,
          { signal: ac.signal },
        );
        const json = await res.json();
        if (id !== runIdRef.current) return; // reset/superseded — stay quiet
        if (!res.ok) throw new Error(json.error ?? "scan failed");
        const rep = json.report as ScanReport;
        setReport(rep);
        // Receipt the verdict in this browser's ledger — the server-side
        // feed is per-node/per-bundle, so this is what the visitor sees.
        recordMyVerdict({
          host: rep.host,
          target: rep.target,
          kind: rep.kind,
          state: rep.state,
          score: rep.score,
          grade: rep.grade,
        });
        setPhase("done");
      } catch (e) {
        if (id !== runIdRef.current) return; // aborted/reset — stay quiet
        setError(e instanceof Error ? e.message : "scan failed");
        setPhase("error");
      } finally {
        if (id === runIdRef.current) busyRef.current = false;
      }
    },
    [target, kind],
  );

  const kinds: ScanKind[] = ["auto", "mcp", "api"];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex rounded-md border border-line overflow-hidden shrink-0">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-2.5 text-[11px] tracking-[0.14em] uppercase transition-colors ${
                kind === k
                  ? "bg-panel2 text-amber"
                  : "bg-transparent text-faint hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="mcp.context7.com/mcp  ·  api.yourcompany.com"
          spellCheck={false}
          className="flex-1 rounded-md border border-line bg-panel px-3.5 py-2.5 text-[13px] text-ink placeholder:text-faint outline-none focus:border-amber"
        />
        <button
          onClick={() => run()}
          disabled={phase === "scanning"}
          className="rounded-md bg-amber px-5 py-2.5 text-[12px] font-bold text-bg hover:opacity-90 disabled:opacity-40 shrink-0"
        >
          {phase === "scanning" ? "Scanning…" : "Run scan"}
        </button>
      </div>

      {/* example chips: fill + immediate run */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-faint">try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => {
              setTarget(ex.target);
              setKind(ex.kind);
              void run(ex.target, ex.kind);
            }}
            disabled={phase === "scanning"}
            className="rounded border border-line px-2.5 py-1 text-[11px] text-dim transition-colors hover:border-dim hover:text-ink disabled:opacity-40"
          >
            {ex.label}
          </button>
        ))}
        <span className="text-[11px] text-faint">
          — free · no account · nothing you paste is stored
        </span>
      </div>

      {phase === "scanning" && (
        <div className="mt-6 card p-5 scanbar">
          <div className="font-mono text-[12px] text-dim">
            » {STAGES[stageIdx]}… {elapsed}ms
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="mt-6 card p-5 border-bad/40">
          <div className="text-[12px] text-bad">{error}</div>
        </div>
      )}

      {phase === "done" && report && (
        <div className="mt-6 card p-4">
          <div className="flex flex-wrap items-start gap-4">
            {/* the verdict */}
            <div
              className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-md px-2.5"
              style={{
                background:
                  report.state === "verified"
                    ? gradeColor(report.grade)
                    : "#5c6167",
              }}
            >
              <span className="text-xl font-bold text-bg">{report.grade}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-ink">{report.summary}</div>
              <div className="mt-1 text-[11px] text-faint">
                {report.kind} · {report.durationMs}ms
              </div>
            </div>
          </div>

          {report.findings.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {report.findings.slice(0, FINDINGS_SHOWN).map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded border border-line bg-panel2 px-3 py-2"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: SEV_COLOR[f.sev] }}
                  />
                  <div className="min-w-0">
                    <div className="text-[12px] text-ink">
                      <span className="text-dim">{f.rule}</span> {f.title}
                    </div>
                    <div className="text-[11px] text-faint truncate">{f.where}</div>
                  </div>
                </div>
              ))}
              {report.findings.length > FINDINGS_SHOWN && (
                <div className="text-[11px] text-faint">
                  + {report.findings.length - FINDINGS_SHOWN} more on the full card
                </div>
              )}
            </div>
          )}

          <ShareRow
            target={report.target}
            kind={kind}
            host={report.host}
            grade={report.grade}
          />

          <a
            href={`/t?target=${encodeURIComponent(scanned)}&kind=${kind}`}
            className="mt-4 inline-block text-[12px] text-amber underline-offset-4 hover:underline"
          >
            Full trust card →
          </a>
        </div>
      )}
    </div>
  );
}
