import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchToolproofTxt,
  matchesPath,
  parseToolproofTxt,
} from "../src/lib/toolproof-txt";

describe("parseToolproofTxt", () => {
  it("parses Deny/Allow/Canary lines, skipping comments and blanks", () => {
    const parsed = parseToolproofTxt(
      [
        "# toolproof.txt — scanning policy",
        "",
        "Deny: /admin",
        "allow: /public", // keys are case-insensitive
        "CANARY:  tok-1234  ", // values are trimmed
        "Deny: /private/keys",
        "not-a-directive line",
      ].join("\n"),
    );
    expect(parsed.deny).toEqual(["/admin", "/private/keys"]);
    expect(parsed.allow).toEqual(["/public"]);
    expect(parsed.canary).toBe("tok-1234");
  });

  it("omits the canary key when no Canary line is present", () => {
    const parsed = parseToolproofTxt("Deny: /\n");
    expect(parsed.deny).toEqual(["/"]);
    expect(parsed.allow).toEqual([]);
    expect("canary" in parsed).toBe(false);
  });

  it("ignores lines without a directive shape and empty values", () => {
    const parsed = parseToolproofTxt("hello\nDeny:\n# Deny: /commented\nAllow: /ok\n");
    expect(parsed.deny).toEqual([]);
    expect(parsed.allow).toEqual(["/ok"]);
  });

  it("handles CRLF line endings", () => {
    const parsed = parseToolproofTxt("Deny: /a\r\nAllow: /b\r\n");
    expect(parsed.deny).toEqual(["/a"]);
    expect(parsed.allow).toEqual(["/b"]);
  });
});

describe("matchesPath", () => {
  it("matches everything for '/' and '*'", () => {
    expect(matchesPath("/", "/")).toBe(true);
    expect(matchesPath("/", "/any/path/at/all")).toBe(true);
    expect(matchesPath("*", "/")).toBe(true);
    expect(matchesPath("*", "/deeply/nested/resource")).toBe(true);
  });

  it("prefix-matches otherwise", () => {
    expect(matchesPath("/admin", "/admin")).toBe(true);
    expect(matchesPath("/admin", "/admin/users")).toBe(true);
    expect(matchesPath("/admin", "/dashboard")).toBe(false);
  });

  it("does not treat '/' as a substring of every path via prefix logic", () => {
    // '/' is special-cased to match everything; other patterns are plain prefixes
    expect(matchesPath("/a", "/b")).toBe(false);
  });
});

describe("fetchToolproofTxt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses the body regardless of content-type — a Deny served as octet-stream still opts out", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response("Deny: /admin\n", {
          status: 200,
          headers: { "content-type": "application/octet-stream" },
        }),
    );
    const parsed = await fetchToolproofTxt("https://example.com");
    expect(parsed?.deny).toEqual(["/admin"]);
    expect(parsed?.allow).toEqual([]);
  });
});
