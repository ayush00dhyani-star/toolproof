"use client";

import { useEffect, useState } from "react";

interface Row {
  label: string;
  note: string;
  target: string;
  host: string | null;
  kind: string;
  state: string;
  score: number | null;
  grade: string;
  error?: string;
}

function gradeBg(grade: string, state: string) {
  if (state !== "verified") return "#5c6167";
  if (grade.startsWith("A")) return "#34d399";
  if (grade === "B") return "#ffb224";
  return "#ff5d5d";
}

export default function SeedsGrid() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/v1/registry")
      .then((r) => r.json())
      .then((j) => setRows(j.results ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="card divide-y divide-line">
      <div className="flex items-center justify-between px-5 py-3">
        <span className="lbl">field notes · live scans</span>
        {rows && (
          <span className="text-[10px] text-faint">
            {rows.filter((r) => r.state === "verified").length}/{rows.length} verified
          </span>
        )}
      </div>
      {!rows && (
        <div className="px-5 py-6 text-[12px] text-faint scanbar">
          scanning the starter registry…
        </div>
      )}
      {rows?.length === 0 && (
        <div className="px-5 py-6 text-[12px] text-faint">
          registry unavailable — try the scan box above
        </div>
      )}
      {rows?.map((r) => (
        <a
          key={r.target}
          href={`/t?target=${encodeURIComponent(r.target)}&kind=auto`}
          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel2"
        >
          <span
            className="flex h-9 w-12 items-center justify-center rounded-md text-[14px] font-bold text-bg shrink-0"
            style={{ background: gradeBg(r.grade, r.state) }}
          >
            {r.grade}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] text-ink">
              {r.label}
              <span className="ml-2 text-[11px] text-faint">{r.note}</span>
            </div>
            <div className="text-[11px] text-faint truncate">
              {r.host ?? r.target}
              {r.state !== "verified" && r.error ? ` — ${r.error}` : ""}
            </div>
          </div>
          <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-faint shrink-0">
            {r.state === "verified" ? r.kind : "unverified"}
          </span>
        </a>
      ))}
    </div>
  );
}
