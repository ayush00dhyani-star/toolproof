/**
 * Minimal line-level diff (LCS). Returns only the changed lines, in
 * document order — enough for the watchlist to say "these lines appeared,
 * these disappeared" without shipping a real diff library to the client.
 */

export interface DiffLine {
  kind: "add" | "del";
  text: string;
}

/** Safety rails: screenshots of MCP surfaces stay well under this. */
const MAX_LINES = 1500;
const MAX_OUT = 400;

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n").map((s) => s.trimEnd());
  const b = newText.split("\n").map((s) => s.trimEnd());
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    // Too big for DP — fall back to a head/tail coarse diff.
    return coarseDiff(a, b);
  }

  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: a[i++] });
    } else {
      out.push({ kind: "add", text: b[j++] });
    }
  }
  while (i < n) out.push({ kind: "del", text: a[i++] });
  while (j < m) out.push({ kind: "add", text: b[j++] });
  return out.slice(0, MAX_OUT);
}

function coarseDiff(a: string[], b: string[]): DiffLine[] {
  // Linear parallel walk — no DP, so it handles huge surfaces. Aligns
  // correctly when the same number of lines changed in place; anything
  // left over on either side is reported as a block.
  const out: DiffLine[] = [];
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  for (let k = i; k < n; k++) {
    if (a[k] !== b[k]) {
      out.push({ kind: "del", text: a[k] });
      out.push({ kind: "add", text: b[k] });
    }
  }
  for (let k = n; k < a.length; k++) out.push({ kind: "del", text: a[k] });
  for (let k = n; k < b.length; k++) out.push({ kind: "add", text: b[k] });
  if (out.length === 0) {
    out.push({ kind: "del", text: `… (${a.length} lines at pin time)` });
    out.push({ kind: "add", text: `… (${b.length} lines now)` });
  }
  return out.slice(0, MAX_OUT);
}
