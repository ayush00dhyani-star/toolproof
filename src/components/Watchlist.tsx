"use client";

import { useEffect, useState } from "react";
import { gradeColor } from "@/lib/score";
import { loadWatch, unwatch, type WatchEntry } from "@/lib/watch";

interface CheckRow extends WatchEntry {
  status: "checking" | "unchanged" | "changed" | "unknown" | "unverifiable";
  nowGrade?: string;
}

/**
 * The watchlist on the leaderboard page. Each visit re-verifies every
 * pinned tool (cached server-side, so it is cheap) and compares the
 * toolTextHash with the hash at pin time. Changed hash = the tool's
 * model-visible text changed since you pinned it.
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
        <div key={r.target} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
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
      ))}
    </div>
  );
}
