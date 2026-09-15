"use client";

import { useState } from "react";

/**
 * The tool-owner half of the loop. A server that earned an A has every reason
 * to say so — and every badge embedded is a permanent, verifiable
 * advertisement that a competitor cannot buy. The snippet is an <img>, so it
 * works in any README without JavaScript or a build step.
 */
export default function EmbedBadge({
  target,
  host,
}: {
  target: string;
  host: string;
}) {
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<"grade" | "flat">("grade");

  const src = `https://toolproof-scan.vercel.app/api/v1/badge?target=${encodeURIComponent(
    target,
  )}&style=${style}`;
  const snippet = `[![Toolproof grade](${src})](${`https://toolproof-scan.vercel.app/t?target=${encodeURIComponent(
    target,
  )}`})`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      window.prompt("Copy this", snippet);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline gap-2 border-b border-line px-5 py-3">
        <span className="text-[12.5px] font-semibold text-ink">
          Show this grade in your README
        </span>
        <span className="text-[11px] text-faint">
          a badge is a link anyone can verify
        </span>
      </div>
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* live preview — this is exactly what the snippet renders */}
          <img
            src={src}
            alt={`Toolproof grade for ${host}`}
            width={style === "flat" ? 240 : 200}
            height={64}
            className="h-16 w-auto"
          />
          <div className="flex gap-1.5">
            {(["grade", "flat"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                  style === s
                    ? "bg-amber/15 text-amber font-medium"
                    : "text-dim hover:text-ink"
                }`}
              >
                {s === "grade" ? "seal" : "flat"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-4">
          <button
            type="button"
            onClick={copy}
            className="absolute right-2 top-2 z-10 rounded border border-line bg-bg/80 px-2 py-1 text-[10px] tracking-[0.14em] uppercase text-amber backdrop-blur hover:opacity-80"
          >
            {copied ? "copied ✓" : "copy"}
          </button>
          <pre className="overflow-x-auto rounded-md border border-line bg-black/20 p-4 text-[11.5px] leading-6 text-dim">
            {snippet}
          </pre>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-faint">
          The badge re-renders on every scan, so it can never go stale silently —
          if the surface changes, the grade changes with it.
        </p>
      </div>
    </div>
  );
}
