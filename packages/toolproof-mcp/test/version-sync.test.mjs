/**
 * Guards a class of bug we already shipped twice: the package was published at
 * 0.2.0 while server.mjs still reported "0.1.1" to every MCP client, and 0.3.0
 * shipped with gate.mjs on "0.2.0" and server.mjs on "0.1.1" again.
 *
 * Pinning a constant to package.json by regex only moves the drift one release
 * into the future. The entry points now derive VERSION from package.json at
 * runtime, so there is nothing to keep in sync — these tests assert that the
 * derivation stays in place, then prove it end to end over a real MCP
 * `initialize` handshake, because a user is shown whatever the handshake says.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8"));
const { version } = pkg;

const ENTRY_POINTS = ["server.mjs", "gate.mjs", "wrap.mjs"];
const read = (file) => readFileSync(resolve(here, "..", file), "utf8");

test(`no entry point hardcodes a version literal (package.json says ${version})`, () => {
  for (const file of ENTRY_POINTS) {
    const src = read(file);
    const hardcoded = src.match(/const VERSION = ["'][\d.]+["']/);
    assert.equal(hardcoded, null, `${file} hardcodes ${hardcoded?.[1]} — derive it from package.json`);
    assert.match(
      src,
      /readFileSync\(new URL\("\.\/package\.json"/,
      `${file} must derive VERSION from package.json`,
    );
  }
});

test("server.mjs reports package.json's version over an initialize handshake", async () => {
  const child = spawn(process.execPath, [resolve(here, "..", "server.mjs")], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  try {
    const reply = await new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error("timed out waiting for initialize")), 15_000);
      let buf = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        buf += chunk;
        for (const line of buf.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed);
            if (msg?.id !== 1) continue;
            clearTimeout(timer);
            res(msg);
            return;
          } catch {
            // Not a JSON-RPC frame — ignore and keep reading.
          }
        }
      });
      child.on("error", (e) => {
        clearTimeout(timer);
        rej(e);
      });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
      );
    });

    assert.equal(
      reply.result?.serverInfo?.version,
      version,
      "the client is told a version that is not the installed one",
    );
    assert.equal(reply.result?.serverInfo?.name, "toolproof");
  } finally {
    child.kill();
  }
});
