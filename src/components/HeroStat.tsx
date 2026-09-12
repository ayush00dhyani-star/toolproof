"use client";

import { useEffect, useState } from "react";

/**
 * Live verdict counter for the hero: fetches /api/v1/feed ONCE (the Ledger
 * section owns the polling view) and renders the per-instance total.
 *
 * Renders nothing while loading and on fetch error — no reserved space, so
 * the line simply appears below the stat row when the count lands.
 */
export default function HeroStat() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/feed", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { total?: number }) => {
        if (alive && typeof json?.total === "number") setTotal(json.total);
      })
      .catch(() => {
        /* feed unreachable — the counter stays hidden */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (total === null) return null;

  return (
    <div className="fadeup mt-6 text-[11px] tracking-[0.14em] text-dim">
      verdicts on this node: {total}
    </div>
  );
}
