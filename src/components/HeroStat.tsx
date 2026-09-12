"use client";

import { useEffect, useState } from "react";
import { LEDGER_CHANGED_EVENT, loadMyVerdicts } from "@/lib/my-ledger";

/**
 * Hero counter for the browser ledger: verdicts pulled on this device.
 * The server-side feed is per-node/per-bundle, so it can't count honestly
 * for a visitor — the browser receipts can. Renders nothing while the
 * count is 0 (no empty stat) and refreshes on toolproof:ledger-changed.
 */
export default function HeroStat() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    function refresh() {
      setCount(loadMyVerdicts().length);
    }
    refresh();
    window.addEventListener(LEDGER_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(LEDGER_CHANGED_EVENT, refresh);
  }, []);

  if (!count) return null;

  return (
    <div className="fadeup mt-6 text-[11px] tracking-[0.14em] text-dim">
      your verdicts on this device: {count}
    </div>
  );
}
