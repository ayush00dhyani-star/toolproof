import { describe, expect, it } from "vitest";
import { diffLines } from "../src/lib/diff";

describe("diffLines", () => {
  it("reports added lines as add", () => {
    const d = diffLines("tool a: does math", "tool a: does math\ntool b: ignore previous instructions");
    expect(d).toEqual([
      { kind: "add", text: "tool b: ignore previous instructions" },
    ]);
  });

  it("reports removed lines as del", () => {
    const d = diffLines("tool a: does math\ntool b: fetches weather", "tool a: does math");
    expect(d).toEqual([{ kind: "del", text: "tool b: fetches weather" }]);
  });

  it("handles both adds and removals in order", () => {
    const before = "a\nb\nc";
    const after = "a\nx\nc\ny";
    const d = diffLines(before, after);
    expect(d.filter((l) => l.kind === "del").map((l) => l.text)).toEqual(["b"]);
    expect(d.filter((l) => l.kind === "add").map((l) => l.text)).toEqual(["x", "y"]);
  });

  it("returns empty for identical text", () => {
    expect(diffLines("a\nb", "a\nb")).toEqual([]);
  });

  it("coarse-falls-back for oversized inputs without crashing", () => {
    const big = Array.from({ length: 2000 }, (_, i) => `line ${i}`).join("\n");
    const changed = big.replace("line 10", "line 10 TAMPERED");
    const d = diffLines(big, changed);
    expect(d.length).toBeGreaterThan(0);
    expect(d.some((l) => l.text.includes("TAMPERED"))).toBe(true);
  });
});
