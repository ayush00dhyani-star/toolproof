"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const RULE_TEXT = `Tool safety rule:
Before connecting to any MCP server or unfamiliar API, verify it first.
GET https://toolproof-scan.vercel.app/api/v1/verify?target=<the url>
Report the grade to the user. If the state is not "verified", or the
grade is below B, tell the user what you found and ask before connecting.`;

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

function buildItems(): Item[] {
  return [
    {
      id: "scan-c7",
      group: "Scan",
      label: "Scan mcp.context7.com/mcp",
      hint: "A+ example",
      run: () => location.assign("/t?target=" + encodeURIComponent("https://mcp.context7.com/mcp")),
    },
    {
      id: "scan-gh",
      group: "Scan",
      label: "Scan api.githubcopilot.com/mcp",
      hint: "auth-gated",
      run: () => location.assign("/t?target=" + encodeURIComponent("https://api.githubcopilot.com/mcp")),
    },
    {
      id: "scan-pet",
      group: "Scan",
      label: "Scan petstore3.swagger.io/api/v3",
      hint: "flagged sample",
      run: () => location.assign("/t?target=" + encodeURIComponent("https://petstore3.swagger.io/api/v3")),
    },
    { id: "go-how", group: "Go", label: "How it works", run: () => location.assign("/#how") },
    { id: "go-why", group: "Go", label: "Why this exists", run: () => location.assign("/#why") },
    { id: "go-checks", group: "Go", label: "What we check", run: () => location.assign("/#checks") },
    { id: "go-grades", group: "Go", label: "Grades in the wild", run: () => location.assign("/#grades") },
    { id: "go-agents", group: "Go", label: "For agents — the rule", run: () => location.assign("/for-agents") },
    { id: "go-docs", group: "Go", label: "API docs", run: () => location.assign("/docs") },
    { id: "go-lock", group: "Go", label: "Toolproof Lock — capability baselines", run: () => location.assign("/lock") },
    { id: "go-lock-ref", group: "Go", label: "Lockfile & CLI reference", run: () => location.assign("/docs#lock") },
    {
      id: "act-theme",
      group: "Actions",
      label: "Toggle light / dark theme",
      run: () => {
        const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("toolproof.theme", next);
        } catch {
          /* private mode */
        }
        window.dispatchEvent(new CustomEvent("toolproof:theme"));
      },
    },
    {
      id: "act-rule",
      group: "Actions",
      label: "Copy the agent rule",
      run: () => {
        try {
          navigator.clipboard.writeText(RULE_TEXT);
        } catch {
          window.prompt("Agent rule", RULE_TEXT);
        }
      },
    },
    { id: "act-pubkey", group: "Actions", label: "View signing public key", run: () => location.assign("/api/v1/pubkey") },
  ];
}

/** Nav trigger — client so its onClick can open the palette. */
export function PaletteTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("toolproof:palette"))}
      className="mono flex items-center gap-1.5 rounded-md border border-hair px-2 py-1 text-[11px] text-faint transition-colors hover:border-dim hover:text-ink"
      aria-label="Open command palette"
    >
      <span>⌘K</span>
    </button>
  );
}

/**
 * ⌘K / Ctrl+K command palette — scan, navigate, act. No dependencies.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const items = useMemo(buildItems, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("toolproof:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("toolproof:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(
    () =>
      items.filter((i) =>
        (i.label + " " + i.group).toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [items, q],
  );

  useEffect(() => {
    if (idx >= filtered.length) setIdx(0);
  }, [filtered.length, idx]);

  function runItem(item: Item) {
    setOpen(false);
    item.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter" && filtered[idx]) {
      e.preventDefault();
      runItem(filtered[idx]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="elevated mx-auto mt-[14vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command or search…"
          spellCheck={false}
          className="w-full bg-transparent px-4 py-3.5 text-[14px] text-ink placeholder:text-faint outline-none border-b border-hair"
        />
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[12.5px] text-faint">
              nothing matches “{q}”
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => runItem(item)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors ${
                i === idx ? "bg-hair3 text-ink" : "text-dim"
              }`}
            >
              <span className="lbl w-14 shrink-0">{item.group}</span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint && <span className="text-[11px] text-faint">{item.hint}</span>}
              {i === idx && <span className="text-[11px] text-faint">↵</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-hair px-4 py-2 text-[11px] text-faint">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
          <span className="ml-auto">toolproof</span>
        </div>
      </div>
    </div>
  );
}
