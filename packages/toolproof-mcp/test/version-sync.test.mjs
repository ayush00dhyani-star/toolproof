/**
 * Guards a class of bug we already shipped once: the package was published at
 * 0.2.0 while server.mjs still reported "0.1.1" to every MCP client and in its
 * startup banner. A drift here is invisible until someone notices the banner,
 * so pin the constants to package.json mechanically.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8"));
const { version } = pkg;

const server = readFileSync(resolve(here, "..", "server.mjs"), "utf8");
const gate = readFileSync(resolve(here, "..", "gate.mjs"), "utf8");

test(`server.mjs reports the package version (${version})`, () => {
  const banner = new RegExp(`toolproof-mcp ${version} —`);
  const serverInfo = new RegExp(`version: "${version}"`);
  if (!banner.test(server)) throw new Error("the startup banner does not report package.json's version");
  if (!serverInfo.test(server)) throw new Error("serverInfo.version does not report package.json's version");
});

test(`gate.mjs reports the package version (${version})`, () => {
  if (!new RegExp(`VERSION = "${version}";`).test(gate))
    throw new Error("gate.mjs VERSION constant does not match package.json");
});
