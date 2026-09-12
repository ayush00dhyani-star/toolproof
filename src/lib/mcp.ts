import { fetchX } from "./net";

export interface McpToolInfo {
  name: string;
  description?: string;
  schema: unknown;
}

export interface McpProbeResult {
  ok: boolean;
  authRequired?: boolean;
  error?: string;
  serverInfo?: { name?: string; version?: string };
  instructions?: string;
  tools?: McpToolInfo[];
  toolCount?: number;
}

const PROTO = "2025-06-18";

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseBody(text: string, contentType: string): any {
  const looksSse =
    contentType.includes("text/event-stream") ||
    /^event:/m.test(text.slice(0, 400)) ||
    /(^|\n)data:/.test(text.slice(0, 400));
  if (looksSse) {
    const lines = text.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload) {
          try {
            return JSON.parse(payload);
          } catch {
            /* keep scanning */
          }
        }
      }
    }
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function postRpc(
  endpoint: URL,
  body: unknown,
  sessionId?: string,
  timeoutMs = 8000,
): Promise<{ res: Response; json: any }> {
  const res = await fetchX(endpoint.toString(), {
    method: "POST",
    timeoutMs,
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "";
  return { res, json: parseBody(text, ct) };
}

export async function probeMcp(endpoint: URL): Promise<McpProbeResult> {
  let session: string | undefined;
  try {
    const init = await postRpc(endpoint, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTO,
        capabilities: {},
        clientInfo: { name: "toolproof", version: "0.1.0" },
      },
    });
    if (init.res.status === 401 || init.res.status === 403)
      return {
        ok: false,
        authRequired: true,
        error: `HTTP ${init.res.status} — auth required`,
      };
    if (init.res.status === 405)
      return {
        ok: false,
        error: "POST rejected (405) — not a streamable-HTTP MCP endpoint",
      };
    const sid = init.res.headers.get("mcp-session-id");
    if (sid) session = sid;
    const msg = init.json;
    if (!msg || msg.jsonrpc !== "2.0" || !msg.result) {
      const detail = msg?.error
        ? `initialize error: ${msg.error.message ?? msg.error.code}`
        : `no JSON-RPC result (HTTP ${init.res.status})`;
      return { ok: false, error: detail };
    }
    const serverInfo = msg.result.serverInfo;
    const instructions: string | undefined = msg.result.instructions;

    try {
      await postRpc(
        endpoint,
        { jsonrpc: "2.0", method: "notifications/initialized" },
        session,
        4000,
      );
    } catch {
      /* notification is best-effort */
    }

    let list = await postRpc(
      endpoint,
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      session,
    );
    if (!list.json?.result && session) {
      list = await postRpc(
        endpoint,
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        undefined,
      );
    }
    const toolsRaw = list.json?.result?.tools;
    if (!Array.isArray(toolsRaw))
      return {
        ok: false,
        error: "handshake ok but tools/list returned no tools",
        serverInfo,
        instructions,
      };
    const tools: McpToolInfo[] = toolsRaw.slice(0, 200).map((t: any) => ({
      name: String(t?.name ?? "?"),
      description:
        typeof t?.description === "string" ? t.description : undefined,
      schema: t?.inputSchema,
    }));
    return {
      ok: true,
      serverInfo,
      instructions,
      tools,
      toolCount: toolsRaw.length,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const timedOut = /timeout|aborted|timed out/i.test(msg);
    return { ok: false, error: timedOut ? "timed out during MCP handshake" : msg };
  }
}
