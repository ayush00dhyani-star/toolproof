import Link from "next/link";
import Proofmark from "@/components/Proofmark";

export default function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <Link href="/" className="ml-auto text-[13px] text-dim transition-colors hover:text-ink">
            ← scan a tool
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <div className="lbl mb-4">{eyebrow}</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[40px]">{title}</h1>
        <p className="mt-3 text-[12.5px] text-faint">Last updated: {updated}</p>
        <div className="mt-10 space-y-10 text-[14px] leading-7 text-dim">{children}</div>
      </article>

      <footer className="border-t border-hair py-8">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-5 text-[12.5px] text-dim" aria-label="Legal">
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/ownership" className="hover:text-ink">Ownership &amp; IP</Link>
          <Link href="/security" className="hover:text-ink">Security</Link>
          <Link href="/docs" className="hover:text-ink">Docs</Link>
          <Link href="/lock" className="hover:text-ink">Lock</Link>
          <Link href="/enterprise" className="hover:text-ink">Enterprise</Link>
        </nav>
      </footer>
    </main>
  );
}
