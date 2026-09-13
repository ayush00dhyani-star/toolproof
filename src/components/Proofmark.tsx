export default function Proofmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" strokeDasharray="1.9 1.24" />
      <circle cx="12" cy="12" r="6.8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.7 12.3 11 14.6 15.4 9.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
