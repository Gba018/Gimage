import path from "node:path";
import { defineConfig } from "vitest/config";
import nextEnv from "@next/env";

// Same .env loading as Next.js, so tests can read TEST_DATABASE_URL.
nextEnv.loadEnvConfig(import.meta.dirname);

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // `server-only` throws outside React Server Components; tests import server modules directly.
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
