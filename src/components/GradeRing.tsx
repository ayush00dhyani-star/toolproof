import { gradeColor } from "@/lib/score";

export default function GradeRing({
  score,
  grade,
  state,
  size = 132,
}: {
  score: number;
  grade: string;
  state: "verified" | "unverified";
  size?: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = state === "verified" ? gradeColor(grade) : "#5c6167";
  const dash = state === "verified" ? (score / 100) * c : c * 0.05;
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-label={`grade ${grade} ${score}/100`}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="#23262b" strokeWidth="7" />
      <circle
        cx="66"
        cy="66"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 66 66)"
      />
      <text
        x="66"
        y="62"
        textAnchor="middle"
        fill={color}
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 34 }}
      >
        {grade}
      </text>
      <text
        x="66"
        y="88"
        textAnchor="middle"
        fill="#9ba0a6"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
      >
        {state === "verified" ? `${score}/100` : "unverified"}
      </text>
    </svg>
  );
}
