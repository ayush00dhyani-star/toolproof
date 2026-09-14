"use client";

import { useEffect, useState } from "react";
import { gradeColor } from "@/lib/score";
import { scanText } from "@/lib/rules";
import { diffLines, type DiffLine } from "@/lib/diff";
import {
  loadWatch,
  unwatch,
  watchEntry,
  type WatchEntry,
} from "@/lib/watch";

interface Flag {
  rule: string;
  title: string;
  sev: string;
}

interface FlaggedDiffLine extends DiffLine {
  flags: Flag[];
}

interface CheckRow extends WatchEntry {
  status: "checking" | "unchanged" | "changed" | "unknown" | "unverifiable";
  nowGrade?: string;
  /** Fresh surface text (only when changed). */
  newText?: string;
  diff?: FlaggedDiffLine[];
  diffTruncated?: boolean;
  flaggedCount?: number;
}

const MAX_DIFF_ROWS = 40;

/** Run the scanner's text rules over a changed line — suspicious additions light up. */
function flagLine(text: string): Flag[] {
  return scanText("watch-diff", text)
    .filter(
      (f) => f.sev === "critical" || f.sev === "high" || f.sev === "medium",
    )
    .slice(0, 3)
    .map((f) => ({ rule: f.rule, title: f.title, sev: f.sev }));
}

/**
 * The watchlist on the leaderboard page. Each visit re-verifies every
 * pinned tool (cached server-side, so it is cheap) and compares the
 * toolTextHash with the hash at pin time. Changed hash = the tool's
 * model-visible text changed since you pinned it — and when a baseline
 * snapshot exists, the actual added/removed lines are shown, with the
 * scanner's text rules run over every new line.
 */
export default function Watchlist() {
  const [rows, setRows] = useState<CheckRow[] | null>(null);

  useEffect(() => {
    const entries = loadWatch();
    if (entries.length === 0) {
      setRows([]);
      return;
    }
    setRows(entries.map((e) => ({ ...e, status: "checking" })));

    (async () => {
      await Promise.all(
        entries.map(async (e, i) => {
          try {
            const res = await fetch(
              "/api/v1/verify?target=" + encodeURIComponent(e.target),
            );
            const json = await res.json();
            const p = json?.passport;
            let status: CheckRow["status"] = "unverifiable";
            if (p?.toolTextHash && e.toolTextHash) {
              status =
                p.toolTextHash === e.toolTextHash ? "unchanged" : "changed";
            }
            setRows((prev) => {
              if (!prev) return prev;
              const next = [...prev];
              next[i] = {
                ...next[i],
                status,
                nowGrade: p?.grade,
                grade: p?.grade ?? e.grade,
                state: p?.state ?? e.state,
                toolTextHash: p?.toolTextHash ?? e.toolTextHash,
              };
              return next;
            });

            if (status === "changed" && e.toolTextSnapshot) {
              await fetchDiff(e, i);
            } else if (
              status === "unchanged" &&
              !e.toolTextSnapshot &&
              p?.toolTextHash
            ) {
              // Legacy pin without a baseline — capture one now so future
              // changes diff. One full scan, then never again until the
              // tool actually changes.
              const scan = await fetch(
                "/api/v1/scan?target=" + encodeURIComponent(e.target),
              ).then((r) => r.json());
              const text: string | undefined = scan?.report?.toolText;
              if (text) {
                watchEntry({
                  target: e.target,
                  host: e.host,
                  grade: p?.grade ?? e.grade,
                  state: p?.state ?? e.state,
                  toolTextHash: p.toolTextHash,
                  toolTextSnapshot: text,
                });
              }
            }
          } catch {
            setRows((prev) => {
              if (!prev) return prev;
              const next = [...prev];
              next[i] = { ...next[i], status: "unverifiable" };
              return next;
            });
          }
        }),
      );
    })();
  }, []);

  async function fetchDiff(e: WatchEntry, i: number) {
    try {
      const scan = await fetch(
        "/api/v1/scan?target=" + encodeURIComponent(e.target),
      ).then((r) => r.json());
      const text: string | undefined = scan?.report?.toolText;
      if (!text) return;
      const raw = diffLines(e.toolTextSnapshot as string, text);
      const lines = raw.map((l) =>
        l.kind === "add"
          ? { ...l, flags: flagLine(l.text) }
          : { ...l, flags: [] },
      );
      const flaggedCount = lines.filter((l) => l.flags.length > 0).length;
      setRows((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[i] = {
          ...next[i],
          newText: text,
          diff: lines,
          diffTruncated: raw.length > MAX_DIFF_ROWS,
          flaggedCount,
        };
        return next;
      });
    } catch {
      /* diff unavailable — the ⚠ changed badge still shows */
    }
  }


  /** User reviewed the diff — roll the baseline forward. */
  function acceptBaseline(r: CheckRow) {
    if (!r.newText || !r.toolTextHash) return;
    watchEntry({
      target: r.target,
      host: r.host,
      grade: r.nowGrade ?? r.grade,
      state: r.state,
      toolTextHash: r.toolTextHash,
      toolTextSnapshot: r.newText,
    });
    setRows((prev) =>
      prev
        ? prev.map((x) =>
            x.target === r.target
              ? {
                  ...x,
                  status: "unchanged" as const,
                  diff: undefined,
                  newText: undefined,
                  flaggedCount: undefined,
                }
              : x,
          )
        : prev,
    );
  }

  function remove(target: string) {
    unwatch(target);
    setRows((prev) => (prev ? prev.filter((r) => r.target !== target) : prev));
  }

  const badge = (r: CheckRow) => {
    switch (r.status) {
      case "checking":
        return <span className="text-[11px] text-faint">checking…</span>;
      case "unchanged":
        return (
          <span className="rounded-md border border-good/30 bg-good/10 px-2 py-0.5 text-[11px] text-good">
            unchanged
          </span>
        );
      case "changed":
        return (
          <span className="rounded-md border border-bad/40 bg-bad/10 px-2 py-0.5 text-[11px] text-bad">
            ⚠ text changed
            {r.flaggedCount ? ` · ${r.flaggedCount} suspicious` : ""}
          </span>
        );
      default:
        return (
          <span className="rounded-md border border-hair px-2 py-0.5 text-[11px] text-faint">
            no fingerprint
          </span>
        );
    }
  };

  return (
    <div className="card divide-y divide-hair overflow-hidden">
      {!rows && (
        <div className="px-5 py-5 text-[12.5px] text-faint">loading watchlist…</div>
      )}
      {rows?.length === 0 && (
        <div className="px-5 py-5 text-[12.5px] text-dim">
          Nothing watched yet. Open any trust card and hit{" "}
          <span className="text-ink">☆ watch this tool</span> — each visit
          here re-checks it and flags if its model-visible text changed.
        </div>
      )}
      {rows?.map((r) => (
        <div key={r.target} className="px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="mono flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold text-chip"
              style={{ background: gradeColor(r.grade) }}
            >
              {r.grade}
            </span>
            <a
              href={`/t?target=${encodeURIComponent(r.target)}`}
              className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-amber"
            >
              {r.host}
            </a>
            {badge(r)}
            <button
              onClick={() => remove(r.target)}
              className="text-[11.5px] text-faint hover:text-bad"
              aria-label={`Stop watching ${r.host}`}
            >
              unwatch
            </button>
          </div>

          {r.status === "changed" && !r.diff && (
            <div className="mt-2 text-[11.5px] text-dim">
              changed since you pinned it —
              {r.toolTextSnapshot
                ? " fetching the diff…"
                : " no baseline stored (unwatch + watch again to start diffing)"}
            </div>
          )}

          {r.diff && r.diff.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-[11.5px] text-amber hover:text-ink">
                show what changed —{" "}
                {r.diff.filter((l) => l.kind === "add").length} added,{" "}
                {r.diff.filter((l) => l.kind === "del").length} removed
                {r.flaggedCount ? ` · ${r.flaggedCount} flagged` : ""}
              </summary>
              <div className="mono mt-2 max-h-72 space-y-0.5 overflow-auto rounded-md border border-hair bg-black/20 p-3 text-[11.5px] leading-5">
                {r.diff.slice(0, MAX_DIFF_ROWS).map((l, k) => (
                  <div
                    key={k}
                    className={
                      l.kind === "add"
                        ? l.flags.length > 0
                          ? "rounded border-l-2 border-bad bg-bad/10 px-2 py-0.5 text-bad"
                          : "rounded border-l-2 border-amber bg-amber/5 px-2 py-0.5 text-amber"
                        : "px-2 py-0.5 text-faint line-through"
                    }
                  >
                    <span className="mr-2 select-none">
                      {l.kind === "add" ? "+" : "−"}
                    </span>
                    {l.text}
                    {l.flags.map((fl) => (
                      <span
                        key={fl.rule}
                        className="ml-2 rounded border border-bad/40 px-1.5 py-px text-[10px] text-bad"
                      >
                        {fl.rule} {fl.title.toLowerCase()}
                      </span>
                    ))}
                  </div>
                ))}
                {r.diffTruncated && (
                  <div className="px-2 pt-1 text-faint">
                    … diff truncated — open the trust card for the full surface
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4">
                <button
                  onClick={() => acceptBaseline(r)}
                  className="rounded-md border border-good/40 px-2.5 py-1 text-[11.5px] text-good hover:bg-good/10"
                >
                  ✓ reviewed — update baseline
                </button>
                <a
                  href={`/t?target=${encodeURIComponent(r.target)}`}
                  className="text-[11.5px] text-dim hover:text-ink"
                >
                  full trust card →
                </a>
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
