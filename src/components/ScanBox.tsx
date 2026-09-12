"use client";

import { useCallback, useState } from "react";
import type { ScanKind, ScanReport } from "@/lib/types";
import { SEV_COLOR } from "@/lib/score";

type Phase = "idle" | "scanning" | "done" | "error";

export default function ScanBox() {
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<ScanKind>("auto");
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    if (!target.trim() || phase === "scanning") return;
    setPhase("scanning");
    setError("");
    setReport(null);
    try {
      const res = await fetch(
        `/api/v1/scan?target=${encodeURIComponent(target.trim())}&kind=${kind}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "scan failed");
      setReport(json.report);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "scan failed");
      setPhase("error");
    }
  }, [target, kind, phase]);

  const kinds: ScanKind[] = ["auto", "mcp", "api"];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex rounded-lg border border-line overflow-hidden shrink-0">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-4 py-3 text-[11px] tracking-[0.2em] uppercase transition-colors ${
                kind === k
                  ? "bg-amber text-bg font-bold"
                  : "bg-transparent text-dim hover:text-ink"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="mcp.context7.com/mcp  ·  api.yourcompany.com"
          spellCheck={false}
          className="flex-1 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-ink placeholder:text-faint outline-none focus:border-amber"
        />
        <button
          onClick={run}
          disabled={phase === "scanning" || !target.trim()}
          className="rounded-lg bg-amber px-6 py-3 text-[12px] font-bold tracking-[0.2em] uppercase text-bg transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
        >
          {phase === "scanning" ? "Scanning…" : "Run scan"}
        </button>
      </div>

      <div className="mt-2 text-[11px] text-faint">
        try: mcp.context7.com/mcp · petstore3.swagger.io/api/v3 — nothing is
        stored, scans are on-demand
      </div>

      {phase === "scanning" && (
        <div className="mt-6 card p-5 scanbar">
          <div className="text-[12px] text-dim">
            probing transport → handshake → tools/list → rule engine…
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="mt-6 card p-5 border-bad/40">
          <div className="text-[12px] text-bad">{error}</div>
        </div>
      )}

      {phase === "done" && report && (
        <div className="mt-6 card p-5 fadeup">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded px-3 py-1 text-[16px] font-bold text-bg"
              style={{ background: report.state === "verified" ? (report.grade.startsWith("A") ? "#34d399" : report.grade === "B" ? "#ffb224" : "#ff5d5d") : "#5c6167" }}
            >
              {report.grade}
            </span>
            <span className="text-sm text-ink">{report.summary}</span>
            <span className="ml-auto text-[11px] text-faint">
              {report.kind} · {report.durationMs}ms
            </span>
          </div>

          {report.findings.length > 0 && (
            <div className="mt-4 space-y-2">
              {report.findings.slice(0, 3).map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <span
                    className="mt-1 h-2 w-2 rounded-full shrink-0"
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
              {report.findings.length > 3 && (
                <div className="text-[11px] text-faint">
                  + {report.findings.length - 3} more on the full card
                </div>
              )}
            </div>
          )}

          <a
            href={`/t?target=${encodeURIComponent(target.trim())}&kind=${kind}`}
            className="mt-4 inline-block text-[12px] text-amber underline-offset-4 hover:underline"
          >
            Full trust card →
          </a>
        </div>
      )}
    </div>
  );
}
