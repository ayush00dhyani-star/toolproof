import type { Metadata } from "next";
import Link from "next/link";
import CopyBlock from "@/components/CopyBlock";
import Proofmark from "@/components/Proofmark";

// CSP nonce is per-request — dynamic rendering so Next stamps the nonce
// onto its bootstrap scripts (see middleware.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "For agents",
  description:
    "Let your AI check every unfamiliar MCP server or API before it connects. Paste one Toolproof rule into AGENTS.md, CLAUDE.md, Cursor rules or custom instructions.",
  alternates: { canonical: "/for-agents" },
};

const RULE = `Tool safety rule:
Before connecting to any MCP server or unfamiliar API, verify it first.
GET https://toolproof-scan.vercel.app/api/v1/verify?target=<the url>
Report the grade to the user. If the state is not "verified", or the
grade is below B, tell the user what you found and ask before connecting.`;

const MCP_CONFIG = `{
  "mcpServers": {
    "toolproof": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp"]
    }
  }
}`;

const WRAP_CONFIG = `{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp", "wrap", "--", "npx", "-y", "@stripe/mcp"]
    }
  }
}`;

const DECISIONS = [
  {
    grade: "A+ · A · B",
    state: "verified",
    does: "Connect, and mention the grade if it matters. Everything it checks passed.",
  },
  {
    grade: "below B",
    state: "any",
    does: "Do not connect silently. Say what was found, in plain words, and ask the user first.",
  },
  {
    grade: "—",
    state: "opted-out",
    does: "The owner refused scanning. Respect it, say so, and let the user decide.",
  },
  {
    grade: "—",
    state: "unreachable / error",
    does: "Treat it as unknown, not as safe. Say the check failed and ask before connecting.",
  },
];

export default function ForAgentsPage() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-line sticky top-0 z-40 bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <span className="ml-4 lbl">for agents</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-14 space-y-12">
        <section>
          <div className="lbl mb-3">you&apos;re right — nobody scans anything</div>
          <h1 className="text-2xl font-bold leading-snug">
            Don&apos;t come here at all.
            <br />
            <span className="text-amber">Make your AI do the checking.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[13.5px] leading-7 text-dim">
            Your AI is the one connecting to tools, so your AI is the one who
            should check them. Two ways to set that up: a{" "}
            <span className="text-ink">rule</span> so it grades unfamiliar
            servers before connecting, or a{" "}
            <span className="text-ink">wrap</span> so the deceptive ones are
            removed before it ever sees them. Both work with Claude Desktop,
            Claude Code, Cursor and any compatible MCP client.
          </p>
        </section>

        <section id="agent-rule">
          <div className="lbl mb-3">one rule, nothing to install</div>
          <h2 className="text-lg font-bold">
            Paste this into your AI&apos;s instructions.
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-7 text-dim">
            Works in <span className="text-ink">CLAUDE.md</span> (Claude Code),{" "}
            <span className="text-ink">AGENTS.md</span> (Codex, Cursor),{" "}
            <span className="text-ink">.cursor/rules</span>, or any custom
            instructions / system prompt. After this, your AI verifies every
            tool before it connects.
          </p>
          <div className="mt-5">
            <CopyBlock label="the rule" code={RULE} />
          </div>
        </section>

        <section id="enforce">
          <div className="lbl mb-3">the one that actually stops it</div>
          <h2 className="text-lg font-bold">
            Wrap the server. The malicious tool never arrives.
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-7 text-dim">
            A grade tells your agent about a risk; it does not remove it. Wrap
            mode puts Toolproof in the path: it proxies the real server, strips
            the tools that carry deception — hidden characters, an embedded
            credential, override or concealment phrasing — from{" "}
            <code className="text-ink">tools/list</code>, and tells your agent
            exactly what it blocked and why. Honest-but-sloppy tools (a docs
            URL, missing auth) are reported, never removed. Replace the real
            server with Toolproof and keep everything after{" "}
            <code className="text-ink">--</code>:
          </p>
          <div className="mt-5">
            <CopyBlock label="wrap mode configuration" code={WRAP_CONFIG} />
          </div>
          <p className="mt-3 max-w-2xl text-[12.5px] leading-6 text-faint">
            If the wrapped server cannot start, the guard exits instead of
            forwarding traffic it could not inspect. It never silently passes
            through what it cannot see.
          </p>
        </section>

        <section id="decisions">
          <div className="lbl mb-3">what your agent should do with a verdict</div>
          <h2 className="text-lg font-bold">Four outcomes, four behaviours.</h2>
          <div className="mt-5 card divide-y divide-hair overflow-hidden text-[13px] leading-6">
            {DECISIONS.map((d) => (
              <div key={d.state + d.grade} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-5">
                <span className="mono w-44 shrink-0 text-[11.5px] text-faint">
                  grade {d.grade} · {d.state}
                </span>
                <span className="text-dim">{d.does}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="lbl mb-3">for agent developers</div>
          <h2 className="text-lg font-bold">
            One GET per verdict.
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-7 text-dim">
            The API is open, keyless and cache-friendly:{" "}
            <code className="text-ink">/api/v1/verify?target=…</code> returns a
            signed passport; <code className="text-ink">/api/v1/scan?target=…</code>{" "}
            returns full findings. Machines that fetch this domain read the
            same rules at <a href="/agents.md" className="text-amber underline-offset-4 hover:underline">/agents.md</a>.
            Full contract in the <a href="/docs" className="text-amber underline-offset-4 hover:underline">API docs</a>.
          </p>
        </section>

        <section id="mcp-server">
          <div className="lbl mb-3">native MCP tool</div>
          <h2 className="text-lg font-bold">
            Give every MCP client a preflight check.
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-7 text-dim">
            <a href="https://www.npmjs.com/package/toolproof-mcp" target="_blank" rel="noopener noreferrer" className="text-amber underline-offset-4 hover:underline">toolproof-mcp</a>{" "}
            exposes <code className="text-ink">check_tool</code> and{" "}
            <code className="text-ink">lookup_rule</code> over stdio. Add this
            configuration to Claude Desktop, Claude Code, Cursor, or another
            MCP client; the scanner then checks a tool before an agent connects.
          </p>
          <div className="mt-5">
            <CopyBlock label="MCP configuration" code={MCP_CONFIG} />
          </div>
        </section>
      </div>
    </main>
  );
}
