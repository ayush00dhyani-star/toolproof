import { defineConfig } from "vitest/config";

// App-level unit tests live in tests/ and use TypeScript.
// The zero-dependency CLI packages ship their own node:test suites under
// packages/*/test/ and are run with `node --test`, so vitest must not
// collect them here.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
