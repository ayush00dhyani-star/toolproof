"use client";

import { useEffect, useState } from "react";
import { isWatched, unwatch, watchEntry } from "@/lib/watch";

/**
 * Pin/unpin a tool on its trust card. Pinned tools appear in the
 * leaderboard watchlist, where each visit re-checks the tool's
 * toolTextHash and flags drift.
 */
export default function WatchToggle({
  target,
  host,
  hash,
  grade,
  state,
}: {
  target: string;
  host: string;
  hash?: string;
  grade: string;
  state: string;
}) {
  const [pinned, setPinned] = useState(false);
  const [drift, setDrift] = useState<"same" | "changed" | "unknown" | null>(null);

  useEffect(() => {
    const existing = isWatched(target);
    setPinned(Boolean(existing));
    if (existing && hash) {
      setDrift(existing.toolTextHash === undefined || existing.toolTextHash === ""
        ? "unknown"
        : existing.toolTextHash === hash
          ? "same"
          : "changed");
    }
  }, [target, hash]);

  function toggle() {
    if (pinned) {
      unwatch(target);
      setPinned(false);
      setDrift(null);
    } else {
      watchEntry({ target, host, grade, state, toolTextHash: hash });
      setPinned(true);
      setDrift(hash ? "same" : "unknown");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={toggle}
        className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
          pinned
            ? "border-amber/50 text-amber hover:bg-amber/10"
            : "border-hair text-dim hover:border-dim hover:text-ink"
        }`}
      >
        {pinned ? "★ watching" : "☆ watch this tool"}
      </button>
      {pinned && drift === "changed" && (
        <span className="rounded-md border border-bad/40 bg-bad/10 px-2.5 py-1 text-[11.5px] text-bad">
          ⚠ tool text changed since you pinned it — review below
        </span>
      )}
      {pinned && drift === "same" && (
        <span className="text-[11.5px] text-faint">
          tool text unchanged since you pinned it
        </span>
      )}
    </div>
  );
}
