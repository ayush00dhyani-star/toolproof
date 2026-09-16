"use client";

import { useState } from "react";
import Proofmark from "@/components/Proofmark";

type Tab = "claude" | "cursor" | "rule" | "wrap";

const TABS: { id: Tab; label: string }[] = [
  { id: "claude", label: "Claude Desktop" },
  { id: "cursor", label: "Cursor" },
  { id: "rule", label: "CLAUDE.md" },
  { id: "wrap", label: "Stop it (wrap)" },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "toolproof": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp"]
    }
  }
}`;

const CURSOR_CONFIG = `# ~/.cursor/mcp.json — Cursor reads this for MCP servers
${MCP_CONFIG}`;

const RULE = `Tool safety rule:
Before connecting to any MCP server or unfamiliar API, verify it first.
GET https://toolproof-scan.vercel.app/api/v1/verify?target=<the url>
Report the grade to the user. If the state is not "verified", or the
grade is below B, tell the user what you found and ask before connecting.`;

const WRAP_CONFIG = `{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp", "wrap", "--", "npx", "-y", "@stripe/mcp"]
    }
  }
}`;

const BODY: Record<Tab, { title: string; where: string; code: string }> = {
  claude: {
    title: "Add one block, every session is guarded",
    where: "Paste into claude_desktop_config.json (Settings → Developer → Edit Config), then restart Claude Desktop.",
    code: MCP_CONFIG,
  },
  cursor: {
    title: "Add one file, Cursor is guarded",
    where: "Save as ~/.cursor/mcp.json, then reload the Cursor window.",
    code: CURSOR_CONFIG,
  },
  rule: {
    title: "No config file? Paste a rule instead",
    where: "CLAUDE.md, AGENTS.md, .cursor/rules, or any system prompt. The agent verifies before it connects.",
    code: RULE,
  },
  wrap: {
    title: "Wrap a server — malicious tools never reach the agent",
    where: "Replace the real server with toolproof-wrap. It proxies the server, strips deceptive tools from tools/list, and tells the agent exactly what it blocked. Honest-but-sloppy tools pass through untouched.",
    code: WRAP_CONFIG,
  },
};

/**
 * The acquisition loop. A verdict page is the moment intent peaks — the
 * visitor just saw the risk with their own eyes — so that is where the
 * one-click install lives. Every guard installed is a durable user.
 */
export default function InstallGuard({
  grade,
}: {
  grade: string;
}) {
  const [tab, setTab] = useState<Tab>("claude");
  const [copied, setCopied] = useState(false);
  const b = BODY[tab];

  async function copy() {
    try {
      await navigator.clipboard.writeText(b.code);
    } catch {
      window.prompt("Copy this", b.code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <Proofmark className="h-4 w-4 shrink-0" />
        <span className="text-[12.5px] font-semibold text-ink">
          Check every tool before you connect
        </span>
        {grade.startsWith("A") || grade === "B" ? (
          <span className="ml-auto text-[11px] text-faint">this one is fine — the next one might not be</span>
        ) : (
          <span className="ml-auto text-[11px] text-[#ff5d5d]">don&apos;t let this happen again</span>
        )}
      </div>

      <div className="px-5 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                tab === t.id
                  ? "bg-amber/15 text-amber font-medium"
                  : "text-dim hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-3.5 text-[13px] text-dim">{b.title}</p>
        <p className="mt-1 text-[11.5px] leading-5 text-faint">{b.where}</p>
      </div>

      <div className="px-5 pb-5 pt-3">
        <div className="relative">
          <button
            type="button"
            onClick={copy}
            className="absolute right-2 top-2 z-10 rounded border border-line bg-bg/80 px-2 py-1 text-[10px] tracking-[0.14em] uppercase text-amber backdrop-blur hover:opacity-80"
          >
            {copied ? "copied ✓" : "copy"}
          </button>
          <pre className="overflow-x-auto rounded-md border border-line bg-black/20 p-4 text-[11.5px] leading-6 text-dim">
            {b.code}
          </pre>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-faint">
          The guard calls the same verdicts you just saw. No account, no key —
          and it never sends your conversations anywhere.
        </p>
      </div>
    </div>
  );
}
