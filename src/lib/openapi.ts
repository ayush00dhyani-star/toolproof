import YAML from "yaml";
import { fetchX } from "./net";

export interface OpenApiHunt {
  ok: boolean;
  specUrl?: string;
  info?: unknown;
  servers?: string[];
  hasSecurity?: boolean;
  pathCount?: number;
  descriptions?: string[];
  suspectParams?: { name: string; where: string }[];
}

const CANDIDATES = [
  "/openapi.json",
  "/openapi.yaml",
  "/swagger.json",
  "/api/openapi.json",
  "/.well-known/openapi.json",
  "/api-docs",
  "/v3/api-docs",
  "/swagger/v1/swagger.json",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function huntOpenApi(u: URL): Promise<OpenApiHunt> {
  const basePath =
    u.pathname && u.pathname !== "/"
      ? u.pathname.replace(/\/$/, "")
      : "";
  const urls = [
    u.origin + basePath + "/openapi.json",
    u.origin + basePath + "/openapi.yaml",
    u.origin + basePath + "/swagger.json",
    ...CANDIDATES.map((p) => u.origin + p),
  ];
  const seen = new Set<string>();

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    let res: Response;
    try {
      res = await fetchX(url, {
        timeoutMs: 6000,
        headers: { accept: "application/json, text/yaml, */*" },
      });
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const text = await res.text();
    let spec: any;
    try {
      spec = JSON.parse(text);
    } catch {
      try {
        spec = YAML.parse(text);
      } catch {
        continue;
      }
    }
    if (!spec || typeof spec !== "object") continue;
    if (!spec.openapi && !spec.swagger) continue;

    const servers: string[] = (Array.isArray(spec.servers) ? spec.servers : [])
      .map((s: any) => (typeof s === "string" ? s : s?.url))
      .filter(Boolean);

    const hasSecurity =
      Boolean(spec.security) ||
      Boolean(spec.components?.securitySchemes) ||
      Object.values(spec.paths ?? {}).some(
        (p: any) => p && typeof p === "object" && p.security !== undefined,
      );

    const descriptions: string[] = [];
    const suspectParams: { name: string; where: string }[] = [];
    let pathCount = 0;
    for (const [pName, ops] of Object.entries(spec.paths ?? {})) {
      pathCount++;
      if (pathCount > 300) break;
      if (!ops || typeof ops !== "object") continue;
      for (const [method, op] of Object.entries(ops as Record<string, any>)) {
        if (!op || typeof op !== "object") continue;
        if (typeof op.description === "string" && op.description)
          descriptions.push(op.description.slice(0, 500));
        if (typeof op.summary === "string" && op.summary)
          descriptions.push(op.summary.slice(0, 200));
        const params = Array.isArray(op.parameters) ? op.parameters : [];
        for (const prm of params) {
          if (
            prm &&
            typeof prm === "object" &&
            typeof prm.name === "string" &&
            /^(api[_-]?key|token|secret|password|access[_-]?token)$/i.test(
              prm.name,
            )
          ) {
            suspectParams.push({
              name: prm.name,
              where: `${method.toUpperCase()} ${pName} → ${prm.name}`,
            });
          }
        }
      }
    }

    return {
      ok: true,
      specUrl: url,
      info: spec.info,
      servers,
      hasSecurity,
      pathCount,
      descriptions: descriptions.slice(0, 80),
      suspectParams: suspectParams.slice(0, 10),
    };
  }
  return { ok: false };
}
