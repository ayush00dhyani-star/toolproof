"use client";

import { useState } from "react";
import Link from "next/link";
import Proofmark from "@/components/Proofmark";

type Phase = "idle" | "subscribing" | "ready" | "error";

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setPhase("subscribing");
    setErr("");
    try {
      const res = await fetch("/api/v1/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "team", email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "try again");
      setToken(body.capabilityToken);
      setPhase("ready");
    } catch (e2) {
      setErr((e2 as Error).message);
      setPhase("error");
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
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

      <article className="mx-auto max-w-3xl px-5 py-14">
        <div className="lbl mb-4">plans</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[36px]">
          Scans are free. Continuity is what a team pays for.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-dim">
          Every verdict, signature and evidence receipt stays free and open forever — that
          is the moat, and it is not for sale. What a team buys is the part that does not
          run in CI: hosted monitoring that re-observes your pinned capability surfaces and
          alerts you the moment one drifts, plus the shared policy and audit trail a
          security team needs.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* free */}
          <div className="card flex flex-col px-5 py-6">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-dim">
              Free
            </div>
            <div className="mt-1 text-[22px] font-semibold text-ink">$0</div>
            <div className="mt-1 text-[12px] text-faint">forever, no account</div>
            <ul className="mt-4 flex-1 space-y-2 text-[12.5px] leading-5 text-dim">
              <li>Unlimited grades, passports and trust cards</li>
              <li>toolproof-lock — lockfile + CI check (MIT)</li>
              <li>Local evidence trail + browser verifier</li>
              <li>check_tool MCP server for every employee</li>
              <li>Watchlist with diff-on-change</li>
            </ul>
            <Link
              href="/"
              className="mt-5 text-[12.5px] text-amber hover:text-ink"
            >
              start scanning →
            </Link>
          </div>

          {/* team */}
          <div className="card flex flex-col border-amber/40 px-5 py-6">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-amber">
              Team
            </div>
            <div className="mt-1 text-[22px] font-semibold text-ink">$49/mo</div>
            <div className="mt-1 text-[12px] text-faint">
              monitoring for 25 capability surfaces
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-[12.5px] leading-5 text-dim">
              <li>Hosted monitoring — re-observes every 6h</li>
              <li>Webhook alerts (Slack, PagerDuty, SIEM) on drift</li>
              <li>Shared Lock policy across every repo</li>
              <li>Hosted evidence export for auditors</li>
              <li>Badge + gate enforcement across all repos</li>
            </ul>
            <a
              href="#start"
              className="mt-5 text-[12.5px] text-amber hover:text-ink"
            >
              start monitoring →
            </a>
          </div>
        </div>

        <section id="start" className="mt-14 scroll-mt-20">
          <div className="lbl mb-4">start monitoring</div>
          <div className="card px-5 py-6">
            {phase !== "ready" ? (
              <form onSubmit={subscribe} className="grid gap-3">
                <label className="text-[13px] text-dim">
                  Contact email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="security@yourcompany.com"
                    className="mt-1.5 block w-full rounded-md border border-hair bg-bg px-3 py-2 text-[13.5px] text-ink outline-none transition-colors focus:border-strong"
                  />
                </label>
                <button
                  type="submit"
                  disabled={phase === "subscribing"}
                  className="rounded-md bg-amber px-4 py-2 text-[13.5px] font-semibold text-bg transition-opacity disabled:opacity-40"
                >
                  {phase === "subscribing" ? "setting up…" : "get a capability token"}
                </button>
                {phase === "error" && (
                  <div className="text-[13px] text-[#ff5d5d]">{err}</div>
                )}
                <p className="text-[11.5px] leading-5 text-faint">
                  We hand you a capability token, not an account. Pin a baseline with{" "}
                  <code className="text-dim">toolproof-lock lock</code>, then POST the
                  target and its fingerprint to start watching. No password to lose, no
                  SSO to configure yet.
                </p>
              </form>
            ) : (
              <div>
                <div className="text-[15px] font-semibold text-[#34d399]">
                  Your capability token is ready.
                </div>
                <pre className="mono mt-3 overflow-x-auto rounded-md border border-hair bg-black/20 p-3 text-[12px] text-dim">{`TOOLPROOF_TOKEN=${token}

# pin a baseline first, if you have not already
npx toolproof-lock lock https://mcp.example.com/mcp

# begin monitoring
curl -X POST https://toolproof-scan.vercel.app/api/v1/monitor \\
  -H "authorization: Bearer $TOOLPROOF_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"target":"https://mcp.example.com/mcp",
       "baselineFingerprint":"<fingerprint from toolproof.lock>",
       "alertUrl":"https://hooks.slack.com/services/…"}'`}</pre>
                <p className="mt-3 text-[12px] leading-6 text-faint">
                  We re-observe the surface and POST to your webhook the moment its
                  fingerprint moves off the baseline. Store the token like any other
                  credential — it is the only thing that can list or stop your monitors.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-14">
          <div className="lbl mb-4">enterprise</div>
          <p className="max-w-2xl text-[14px] leading-7 text-dim">
            Self-hosted scanner and signing keys, SSO/SAML and RBAC, SIEM streaming of
            signed verdicts, and vendor due-diligence reports on demand.{" "}
            <a
              className="text-amber underline-offset-4 hover:underline"
              href="mailto:security@toolproof-scan.vercel.app?subject=Toolproof%20Enterprise"
            >
              Talk to us
            </a>
            .
          </p>
        </section>

        <p className="mt-12 text-[12px] leading-6 text-faint">
          The free tier is the product, not a trial. Nothing on it stops working, and
          every receipt it produces is exactly as verifiable as a paying team&apos;s.
        </p>
      </article>
    </main>
  );
}
