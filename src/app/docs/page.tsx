import type { Metadata } from "next";
import Link from "next/link";
import { RULES } from "@/lib/rules";

export const metadata: Metadata = {
  title: "API docs",
};

const PUBKEY = process.env.NEXT_PUBLIC_TOOLPROOF_PUBLIC_KEY ?? "unconfigured";

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-line sticky top-0 z-40 bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center">
          <Link href="/" className="text-[13px] font-bold tracking-[0.3em] text-amber">
            TOOLPROOF
          </Link>
          <span className="ml-4 lbl">api docs · v0.1</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-12 space-y-14">
        <section>
          <div className="lbl mb-3">quickstart</div>
          <h1 className="h-display text-3xl font-bold tracking-tight">
            Ask before you trust.
          </h1>
          <p className="mt-4 text-[13px] leading-7 text-dim max-w-2xl">
            One GET per verdict. No keys, no accounts. Responses are
            cache-friendly (s-maxage), rate-limited to 30 scans/min per IP,
            and every scan result is signed so you can verify it offline.
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`curl "https://<host>/api/v1/verify?target=https://mcp.context7.com/mcp"`}</pre>
        </section>

        <section>
          <div className="lbl mb-4">endpoints</div>
          <div className="card divide-y divide-line">
            {[
              {
                m: "GET",
                p: "/api/v1/scan?target=&kind=auto|mcp|api",
                d: "Full scan report: findings with evidence, positives, metadata. The interactive API.",
              },
              {
                m: "GET",
                p: "/api/v1/verify?target=&kind=",
                d: "Signed passport: the verdict an agent should consult before calling a tool. ed25519 over canonical JSON.",
              },
              {
                m: "GET",
                p: "/api/v1/registry",
                d: "Starter registry, scanned live. Cached 15 min.",
              },
              {
                m: "GET",
                p: "/api/v1/badge?target=",
                d: "SVG badge for READMEs and dashboards. Cached 10 min.",
              },
              {
                m: "GET",
                p: "/api/v1/pubkey",
                d: "The signing public key, PEM-encoded.",
              },
            ].map((e) => (
              <div key={e.p} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="rounded bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">{e.m}</span>
                  <code className="text-[12.5px] text-ink">{e.p}</code>
                </div>
                <p className="mt-2 text-[12px] leading-6 text-dim">{e.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="lbl mb-4">the passport</div>
          <p className="text-[13px] leading-7 text-dim max-w-2xl">
            <code className="text-ink">passport</code> is serialized with
            sorted keys (<code className="text-ink">canonical JSON</code>) and
            signed with ed25519. Verify like this — no toolproof code
            required:
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`import { verify, createPublicKey } from "node:crypto";

const res = await fetch(
  \`https://<host>/api/v1/verify?target=\${encodeURIComponent(target)}\`
);
const { passport, signature, alg } = await res.json();

// canonical JSON: keys sorted recursively, then serialized
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}
const canonical = JSON.stringify(canonicalize(passport));

const ok = verify(
  null,
  Buffer.from(canonical),
  createPublicKey(process.env.TOOLPROOF_PUBKEY),
  Buffer.from(signature, "base64")
);
// alg === "ed25519" && ok  →  the verdict is authentic and unmodified`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            The sort must be recursive — nested objects like{" "}
            <code className="text-dim">findingCounts</code> and{" "}
            <code className="text-dim">scanner</code> are part of the signed
            bytes. That&apos;s the entire ceremony.
          </p>
        </section>

        <section>
          <div className="lbl mb-4">current signing key</div>
          <pre className="overflow-x-auto card p-5 text-[11px] leading-6 text-dim whitespace-pre-wrap">{PUBKEY}</pre>
          <p className="mt-3 text-[12px] text-faint">
            keyId <code className="text-dim">tpk-1</code> · algorithm{" "}
            <code className="text-dim">ed25519</code>. Rotate = new keyId.
          </p>
        </section>

        <section>
          <div className="lbl mb-4">rule catalog</div>
          <div className="card divide-y divide-line">
            {RULES.map((r) => (
              <div key={r.id} className="px-5 py-4 flex gap-4 items-baseline">
                <code className="text-[12px] text-amber shrink-0">{r.id}</code>
                <div>
                  <div className="text-[12.5px] font-bold">
                    {r.name}{" "}
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-faint">
                      {r.sev} · {r.group}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-6 text-dim">{r.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="lbl mb-4">honest limits</div>
          <ul className="space-y-3 text-[13px] leading-7 text-dim max-w-2xl">
            <li>· Scans are point-in-time. A passport speaks for its scannedAt, not for the tool&apos;s next deploy.</li>
            <li>· Static analysis of tool text — not a sandbox. Behavioral canaries ship in v1.</li>
            <li>· Rate limit 30 scans/min/IP. Please cache; responses carry s-maxage.</li>
            <li>· v0 is best-effort: no SLA, no warranty. A passing grade is a receipt, not a guarantee.</li>
          </ul>
        </section>

        <footer className="border-t border-line pt-8 pb-4 text-[11px] text-faint">
          Toolproof — built by Ayush Dhyani ·{" "}
          <a href="/.well-known/security.txt" className="hover:text-ink">security.txt</a>
        </footer>
      </div>
    </main>
  );
}
