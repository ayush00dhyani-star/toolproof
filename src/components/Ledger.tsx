"use client";

import { useEffect, useRef, useState } from "react";
import { gradeColor } from "@/lib/score";
import {
  LEDGER_CHANGED_EVENT,
  loadMyVerdicts,
  type MyVerdict,
} from "@/lib/my-ledger";

interface FeedEntry {
  host: string;
  target: string;
  kind: string;
  state: string;
  score: number;
  grade: string;
  at: number;
}

// Both panels render the same columns; MyVerdict and FeedEntry both fit.
interface Row {
  host: string;
  target: string;
  kind: string;
  grade: string;
  state: string;
  at: number;
}

const POLL_MS = 10_000;

function hhmmss(at: number): string {
  return new Date(at).toTimeString().slice(0, 8);
}

function VerdictTable({ rows }: { rows: Row[] }) {
  return (
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
        {rows.map((e) => {
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
  );
}

export default function Ledger() {
  const [mine, setMine] = useState<MyVerdict[] | null>(null);
  const [items, setItems] = useState<FeedEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hovering, setHovering] = useState(false);
  const hoveringRef = useRef(false);

  // Panel a — this browser's receipts. Loaded once, then re-read whenever
  // recordMyVerdict dispatches toolproof:ledger-changed (ScanBox, trust
  // cards), so a fresh scan updates the table without a reload.
  useEffect(() => {
    function refresh() {
      setMine(loadMyVerdicts());
    }
    refresh();
    window.addEventListener(LEDGER_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(LEDGER_CHANGED_EVENT, refresh);
  }, []);

  // Panel b — the node feed. Polls /api/v1/feed every 10s, skipped while
  // the tab is hidden or the reader is hovering a row; the feed resumes
  // on the next interval tick.
  useEffect(() => {
    let alive = true;

    async function tick() {
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
      {/* a) your verdicts · this browser */}
      <div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="lbl">your verdicts · this browser</span>
          <span className="text-[10px] text-faint">
            {mine ? `${mine.length} receipt${mine.length === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        {!mine && (
          <div className="px-5 py-6 text-[12px] text-faint">
            reading receipts…
          </div>
        )}

        {mine?.length === 0 && (
          <div className="px-5 py-6 text-[12px] text-faint">
            nothing yet — run a scan above
          </div>
        )}

        {mine && mine.length > 0 && <VerdictTable rows={mine} />}
      </div>

      {/* b) this node · live */}
      <div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="lbl flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-good"
              style={{ opacity: hovering ? 0.3 : 1 }}
            />
            this node · live
          </span>
          <span className="text-[10px] text-faint">
            {items ? `${total} verdicts` : ""}
          </span>
        </div>

        {!items && (
          <div className="px-5 py-6 text-[12px] text-faint scanbar">
            listening for verdicts…
          </div>
        )}

        {items?.length === 0 && (
          <div className="px-5 py-6 text-[12px] text-faint">
            no verdicts served by this node yet — scans land here when they
            share an instance
          </div>
        )}

        {items && items.length > 0 && <VerdictTable rows={items} />}

        <div className="px-5 py-2.5 text-[10px] leading-5 text-faint">
          in-memory, on this node — resets on cold start, per-bundle on
          Vercel. fresh scans only; cache hits don&apos;t count.
        </div>
      </div>
    </div>
  );
}
