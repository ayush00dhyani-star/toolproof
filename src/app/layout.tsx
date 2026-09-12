import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Toolproof — trust infrastructure for the agent economy",
    template: "%s — Toolproof",
  },
  description:
    "Toolproof probes MCP servers and public APIs for agent-hijack vectors — hidden instructions in tool descriptions, silent auth gaps, scope creep — then issues a signed trust passport anyone can verify offline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${jbmono.variable}`}>
      <body className="grain antialiased">{children}</body>
    </html>
  );
}
