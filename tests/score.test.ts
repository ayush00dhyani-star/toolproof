import { describe, expect, it } from "vitest";
import { SEVS, SEV_WEIGHT, gradeScore } from "../src/lib/score";

describe("gradeScore boundaries", () => {
  // one entry per boundary plus both sides of each cut: 95/85/70/50/30
  const cases: [number, string][] = [
    [100, "A+"],
    [95, "A+"],
    [94, "A"],
    [85, "A"],
    [84, "B"],
    [70, "B"],
    [69, "C"],
    [50, "C"],
    [49, "D"],
    [30, "D"],
    [29, "F"],
    [0, "F"],
  ];
  it("maps scores to grades at every boundary", () => {
    for (const [score, grade] of cases) expect(gradeScore(score)).toBe(grade);
  });
});

describe("SEV_WEIGHT", () => {
  it("weights severities critical 45 / high 25 / medium 12 / low 5 / info 0", () => {
    expect(SEV_WEIGHT).toEqual({ critical: 45, high: 25, medium: 12, low: 5, info: 0 });
  });

  it("covers exactly the five severities", () => {
    expect(Object.keys(SEV_WEIGHT).sort()).toEqual([...SEVS].sort());
  });

  it("scores a report deductively (100 − weights, clamped)", () => {
    // one critical + one medium deduction → 43 → grade D
    const deductions = SEV_WEIGHT.critical + SEV_WEIGHT.medium;
    expect(gradeScore(Math.max(0, 100 - deductions))).toBe("D");
    // one high deduction → 75 → grade B
    expect(gradeScore(100 - SEV_WEIGHT.high)).toBe("B");
  });
});
