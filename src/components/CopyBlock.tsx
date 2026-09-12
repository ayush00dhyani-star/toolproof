"use client";

import { useState } from "react";

export default function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      window.prompt("Copy this", code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
        <span className="lbl">{label}</span>
        <button
          onClick={copy}
          className="text-[11px] tracking-[0.14em] uppercase text-amber hover:opacity-80"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="px-5 py-4 text-[12px] leading-6 overflow-x-auto text-dim whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}
