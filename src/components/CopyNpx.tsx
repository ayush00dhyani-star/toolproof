"use client";

import { useRef, useState } from "react";

// The canonical try-it command — mirrors the hero's example target and the
// published package name.
const CMD = "npx toolproof-scan mcp.context7.com/mcp";

/**
 * CLI one-liner under the hero ScanBox: bordered mono block with a copy
 * button. Clipboard + "copied ✓" for 1.5s, prompt fallback — same pattern
 * as ShareRow.
 */
export default function CopyNpx() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(CMD);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy command", CMD);
    }
  }

  return (
    <div>
      <div className="lbl mb-2">or, from your terminal:</div>
      <div className="flex items-center gap-3 rounded-lg border border-line bg-panel py-2 pl-4 pr-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[12.5px] text-dim">
          <span className="text-faint">$ </span>
          {CMD}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase text-dim transition-colors hover:border-amber hover:text-ink"
        >
          {copied ? <span className="text-good">copied ✓</span> : "copy"}
        </button>
      </div>
    </div>
  );
}
