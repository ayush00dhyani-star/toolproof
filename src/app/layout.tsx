import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://toolproof-scan.vercel.app"),
  title: {
    default: "Toolproof — is this AI tool safe? Paste a link. Know in seconds.",
    template: "%s — Toolproof",
  },
  description:
    "Paste a link. Get a safety grade for any AI tool, MCP server or API in seconds — free. Hidden instructions, exposed secrets, unsafe defaults: caught before your AI connects.",
  alternates: { canonical: "/" },
};

// Sitewide structured data: WebSite + SoftwareApplication.
// Keeps Toolproof legible to search engines and AI answer engines.
const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://toolproof-scan.vercel.app/#website",
      url: "https://toolproof-scan.vercel.app/",
      name: "Toolproof",
      description:
        "Free safety grades for AI tools — MCP servers and APIs. Checks for hidden instructions, exposed secrets and unsafe defaults before your AI connects.",
      publisher: { "@id": "https://toolproof-scan.vercel.app/#org" },
    },
    {
      "@type": "Organization",
      "@id": "https://toolproof-scan.vercel.app/#org",
      name: "Toolproof",
      url: "https://toolproof-scan.vercel.app/",
    },
    {
      "@type": "SoftwareApplication",
      name: "Toolproof",
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web, CLI (npx toolproof-scan)",
      url: "https://toolproof-scan.vercel.app/",
      description:
        "Paste a link to any MCP server or API and get a signed letter-grade safety verdict in seconds — hidden instructions, exposed secrets, unsafe defaults, missing auth. Free, no account.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

// Runs before first paint: applies the saved theme and marks that JS is on
// (scroll-reveal only hides content under html.js, so no-JS users see everything).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("toolproof.theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}document.documentElement.classList.add("js")})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${jbmono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSONLD) }}
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
