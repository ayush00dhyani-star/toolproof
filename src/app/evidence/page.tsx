"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { verifyBundle } from "@/lib/evidence";
import type { EvidenceBundle } from "@/lib/evidence-types";
import Proofmark from "@/components/Proofmark";

type Phase = "empty" | "verifying" | "ok" | "bad" | "error";

export default function EvidencePage() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("empty");
  const [result, setResult] = useState<Awaited<ReturnType<typeof verifyBundle>> | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (raw: string) => {
    if (!raw.trim()) {
      setPhase("empty");
      setResult(null);
      return;
    }
    setPhase("verifying");
    setErr("");
    try {
      const parsed = JSON.parse(raw);
      const r = await verifyBundle(parsed);
      setResult(r);
      setPhase(r.ok ? "ok" : "bad");
    } catch (e) {
      setErr((e as Error).message || "could not parse JSON");
      setResult(null);
      setPhase("error");
    }
  }, []);

  const onFile = useCallback(
    async (f: File) => {
      const raw = await f.text();
      setText(raw);
      run(raw);
    },
    [run],
  );

  return (
    <main className="min-h-screen">
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-5">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <Link
            href="/"
            className="ml-auto text-[13px] text-dim transition-colors hover:text-ink"
          >
            ← scan a tool
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12">
        <div className="lbl mb-4">verify an audit export</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[36px]">
          Evidence verifier
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-dim">
          Paste a <code className="rounded bg-card px-1.5 py-0.5 text-[13px]">toolproof evidence
          export</code> — the bundle your CI writes with{" "}
          <code className="rounded bg-card px-1.5 py-0.5 text-[13px]">toolproof evidence export</code>.
          It is checked entirely in your browser: the signature, the hash chain, and every
          receipt. Nothing is uploaded, nothing is stored, no account is needed.
        </p>

        <div className="mt-8 grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-hair bg-card px-3.5 py-2 text-[13.5px] font-medium text-ink transition-colors hover:border-strong"
            >
              drop or choose audit.json
            </button>
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setPhase("empty");
                  setResult(null);
                }}
                className="text-[13px] text-dim transition-colors hover:text-ink"
              >
                clear
              </button>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (phase !== "empty" && !e.target.value.trim()) setPhase("empty");
            }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            placeholder='{"kind":"toolproof.evidence.export", …}'
            spellCheck={false}
            className="h-56 w-full resize-y rounded-lg border border-hair bg-card p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none transition-colors focus:border-strong"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={phase === "verifying" || !text.trim()}
              onClick={() => run(text)}
              className="rounded-md bg-amber px-4 py-2 text-[13.5px] font-semibold text-bg transition-opacity disabled:opacity-40"
            >
              {phase === "verifying" ? "verifying…" : "verify"}
            </button>
            <span className="text-[12.5px] text-faint">
              keyless · offline-in-browser · ed25519 + sha256
            </span>
          </div>
        </div>

        {phase === "error" && (
          <div className="mt-6 rounded-lg border border-strong bg-card p-4 text-[13.5px] text-ink">
            <div className="font-semibold text-[#ff5d5d]">not JSON</div>
            <div className="mt-1 text-dim">{err}</div>
          </div>
        )}

        {result && (phase === "ok" || phase === "bad") && (
          <div className="mt-8">
            <div
              className={`rounded-lg border p-5 ${
                phase === "ok"
                  ? "border-[#34d399]/40 bg-[#34d399]/[0.06]"
                  : "border-[#ff5d5d]/40 bg-[#ff5d5d]/[0.06]"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl font-semibold ${
                    phase === "ok" ? "text-[#34d399]" : "text-[#ff5d5d]"
                  }`}
                >
                  {phase === "ok" ? "Evidence verified" : "Evidence rejected"}
                </span>
                <span className="text-[12.5px] text-dim">
                  {result.count} receipt{result.count === 1 ? "" : "s"} ·{" "}
                  {result.keyId ?? "no key id"}
                </span>
              </div>
              {phase === "ok" ? (
                <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
                  Every receipt in this export matches its stored hash, the chain links in
                  order, and the bundle signature verifies under the issuer key embedded in
                  the file — so the contents cannot have been rewritten after it was issued.
                  {result.issuedAt && (
                    <>
                      {" "}
                      Export issued{" "}
                      <span className="text-ink">
                        {new Date(result.issuedAt).toLocaleString()}
                      </span>
                      {" "}of {result.total ?? "?"} recorded decisions
                      {result.range
                        ? ` (receipts ${result.range.from}–${result.range.to})`
                        : ""}
                      .
                    </>
                  )}
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-[13.5px] text-dim">
                  {result.problems.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#ff5d5d]">✕</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {phase === "ok" && result.bundle && (
              <div className="mt-6">
                <div className="lbl mb-3">decision history in this export</div>
                <div className="overflow-hidden rounded-lg border border-hair">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-card text-faint">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">when</th>
                        <th className="px-3 py-2 font-medium">decision</th>
                        <th className="px-3 py-2 font-medium">actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.bundle as EvidenceBundle).receipts.map((rec, i) => (
                        <tr key={i} className="border-t border-hair">
                          <td className="px-3 py-2 text-faint">
                            {result.range ? result.range.from + i : i}
                          </td>
                          <td className="px-3 py-2 text-dim">
                            {rec.ts ? new Date(rec.ts).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                rec.decision === "blocked"
                                  ? "font-medium text-[#ff5d5d]"
                                  : rec.decision === "review-required"
                                    ? "font-medium text-[#ffb224]"
                                    : "text-[#34d399]"
                              }
                            >
                              {rec.decision}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-dim">{rec.actor ?? "unknown"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[12px] text-faint">
                  Receipts carry fingerprints, decisions, policy and actor only — never
                  prompt content, tool arguments or results. This is what makes an evidence
                  store safe to hand to an auditor.
                </p>
              </div>
            )}
          </div>
        )}
      </article>
    </main>
  );
}
