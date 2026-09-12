import { describe, expect, it } from "vitest";
import { stableStringify } from "../src/lib/sign";

describe("stableStringify", () => {
  it("sorts object keys at every nesting level", () => {
    const value = { b: 1, a: { d: 2, c: [{ z: 3, y: 4 }] } };
    expect(stableStringify(value)).toBe('{"a":{"c":[{"y":4,"z":3}],"d":2},"b":1}');
  });

  it("is deterministic regardless of key insertion order", () => {
    const a = stableStringify({ kind: "mcp", host: "x", v: 1, findings: [{ rule: "TP-101", sev: "high" }] });
    const b = stableStringify({ findings: [{ sev: "high", rule: "TP-101" }], v: 1, host: "x", kind: "mcp" });
    expect(a).toBe(b);
  });

  it("preserves array order (only keys are sorted)", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
    expect(stableStringify({ list: ["z", "a"] })).toBe('{"list":["z","a"]}');
  });

  it("passes primitives through unchanged", () => {
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("s")).toBe('"s"');
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(true)).toBe("true");
  });
});
