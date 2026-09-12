export interface Seed {
  target: string;
  kind: "auto" | "mcp";
  label: string;
  note: string;
}

/** Curated starter registry — scanned live on load, not hand-scored. */
export const SEEDS: Seed[] = [
  {
    target: "https://mcp.context7.com/mcp",
    kind: "mcp",
    label: "Context7",
    note: "docs lookup for coding agents",
  },
  {
    target: "https://mcp.deepwiki.com/mcp",
    kind: "mcp",
    label: "DeepWiki",
    note: "repository Q&A",
  },
  {
    target: "https://learn.microsoft.com/api/mcp",
    kind: "mcp",
    label: "Microsoft Learn",
    note: "official docs server",
  },
  {
    target: "https://api.githubcopilot.com/mcp",
    kind: "mcp",
    label: "GitHub MCP",
    note: "auth-gated — positive control",
  },
  {
    target: "https://petstore3.swagger.io/api/v3",
    kind: "auto",
    label: "Petstore 3",
    note: "classic OpenAPI sample",
  },
  {
    target: "https://httpbin.org",
    kind: "auto",
    label: "httpbin",
    note: "request inspector",
  },
];
