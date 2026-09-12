import type { Sev } from "./types";

export const SEVS: Sev[] = ["critical", "high", "medium", "low", "info"];

export const SEV_WEIGHT: Record<Sev, number> = {
  critical: 45,
  high: 25,
  medium: 12,
  low: 5,
  info: 0,
};

export const SEV_COLOR: Record<Sev, string> = {
  critical: "#ff5d5d",
  high: "#ff8a3d",
  medium: "#ffb224",
  low: "#7dd3fc",
  info: "#9ba0a6",
};

export function gradeScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#34d399";
  if (grade === "B") return "#ffb224";
  if (grade === "—" || grade === "") return "#5c6167";
  return "#ff5d5d";
}
