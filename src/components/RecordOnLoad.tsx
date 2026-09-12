"use client";

import { useEffect, useRef } from "react";
import { recordMyVerdict } from "@/lib/my-ledger";
import type { ScanState } from "@/lib/types";

/**
 * Fire-and-forget receipt writer for the server-rendered trust card:
 * viewing a card pulls its verdict, so it lands in the browser ledger
 * ("verdicts you pulled"). Records exactly once per mount; renders nothing.
 */
export default function RecordOnLoad({
  host,
  target,
  kind,
  state,
  score,
  grade,
}: {
  host: string;
  target: string;
  kind: string;
  state: ScanState;
  score: number;
  grade: string;
}) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    recordMyVerdict({ host, target, kind, state, score, grade });
  }, [host, target, kind, state, score, grade]);

  return null;
}
