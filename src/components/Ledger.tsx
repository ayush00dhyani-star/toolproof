"use client";

import { useEffect, useRef, useState } from "react";
import { gradeColor } from "@/lib/score";

interface FeedEntry {
  host: string;
  target: string;
  kind: string;
  state: string;
  score: number;
  grade: string;
  at: number;
}

const POLL_MS = 10_000;

function hhmmss(at: number): string {
  return new Date(at).toTimeString().slice(0, 8);
}

export default function Ledger() {
  const [items, setItems] = useState<FeedEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hovering, setHovering] = useState(false);
  const hoveringRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function tick() {
      // Paused while the tab is hidden or the reader is hovering a row —
      // the feed resumes on the next interval tick.
      if (document.hidden || hoveringRef.current) return;
      try {
        const res = await fetch("/api/v1/feed", { cache: "no-store" });
        const json = (await res.json()) as {
          total?: number;
          items?: FeedEntry[];
        };
        if (!alive) return;
        setItems(Array.isArray(json.items) ? json.items : []);
        setTotal(typeof json.total === "number" ? json.total : 0);
      } catch {
        if (alive) setItems((prev) => prev ?? []);
      }
    }

    function onVisibility() {
      if (!document.hidden) void tick();
    }

    void tick();
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function setHover(v: boolean) {
    hoveringRef.current = v;
    setHovering(v);
  }

  return (
    <div
      className="card divide-y divide-line"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center justify-between px-5 py-3">
        <span className="lbl flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-good"
            style={{ opacity: hovering ? 0.3 : 1 }}
          />
          the ledger · live verdicts
        </span>
        <span className="text-[10px] text-faint">
          {items ? `${total} verdicts · on this node` : ""}
        </span>
      </div>

      {!items && (
        <div className="px-5 py-6 text-[12px] text-faint scanbar">
          listening for verdicts…
        </div>
      )}

      {items?.length === 0 && (
        <div className="px-5 py-6 text-[12px] text-faint">
          no verdicts on this node yet — run a scan
        </div>
      )}

      {items && items.length > 0 && (
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-faint">
              <th className="px-5 py-2 font-normal">time</th>
              <th className="py-2 pr-3 font-normal">host</th>
              <th className="py-2 pr-3 font-normal">kind</th>
              <th className="py-2 pr-3 font-normal">grade</th>
              <th className="py-2 pr-5 font-normal">state</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const color = gradeColor(e.grade);
              return (
                <tr
                  key={`${e.target}-${e.at}`}
                  title={e.target}
                  className="border-t border-line transition-colors hover:bg-panel2"
                >
                  <td className="px-5 py-2.5 whitespace-nowrap text-faint">
                    {hhmmss(e.at)}
                  </td>
                  <td className="py-2.5 pr-3 max-w-[220px] truncate text-ink">
                    {e.host}
                  </td>
                  <td className="py-2.5 pr-3 text-dim">{e.kind}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        color,
                        background: `${color}1f`,
                        border: `1px solid ${color}3d`,
                      }}
                    >
                      {e.grade}
                    </span>
                  </td>
                  <td className="py-2.5 pr-5 text-[11px] text-dim">
                    {e.state}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="px-5 py-2.5 text-[10px] leading-5 text-faint">
        in-memory, on this node — resets on cold start, never persisted.
        fresh scans only; cache hits don&apos;t count.
      </div>
    </div>
  );
}
