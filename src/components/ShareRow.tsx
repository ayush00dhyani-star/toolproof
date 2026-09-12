"use client";

import { useRef, useState } from "react";
import type { ScanKind } from "@/lib/types";

// Hardcoded production origin: share/badge links must resolve to the
// deployed site regardless of where the card is viewed.
const ORIGIN = "https://toolproof-scan.vercel.app";

type CopyKind = "link" | "badge";

export default function ShareRow({
  target,
  kind,
  host,
  grade,
}: {
  target: string;
  kind: ScanKind;
  host: string;
  grade: string;
}) {
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = `target=${encodeURIComponent(target)}&kind=${kind}`;
  const cardUrl = `${ORIGIN}/t?${q}`;
  const badgeUrl = `${ORIGIN}/api/v1/badge?${q}`;
  const shareText = `${host} scans ${grade} on Toolproof — signed trust passport for the agent economy`;
  const badgeMarkdown = `[![toolproof](${badgeUrl})](${cardUrl})`;

  async function copy(text: string, which: CopyKind) {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(which);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy link", text);
    }
  }

  const btn =
    "rounded-lg border border-line px-3 py-2 text-[11px] tracking-[0.14em] uppercase text-dim transition-colors hover:border-amber hover:text-ink";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="lbl mr-2">share</span>
      <button onClick={() => copy(cardUrl, "link")} className={btn}>
        {copied === "link" ? <span className="text-good">copied ✓</span> : "copy link"}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
      >
        post on x
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
      >
        share on linkedin
      </a>
      <button onClick={() => copy(badgeMarkdown, "badge")} className={btn}>
        {copied === "badge" ? <span className="text-good">copied ✓</span> : "copy badge markdown"}
      </button>
    </div>
  );
}
