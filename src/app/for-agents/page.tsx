import type { Metadata } from "next";
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

export default function ForAgentsPage() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-line sticky top-0 z-40 bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center">
          <a href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </a>
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
            should check them. Add this one rule, and it can verify unfamiliar
            MCP servers or APIs before it connects.
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
