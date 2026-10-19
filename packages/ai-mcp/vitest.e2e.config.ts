import { defineConfig } from "vitest/config";

// Real-tenant specs. Still gated on AUTH0_E2E=1 (set by the test:e2e script).
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/e2e/**/*.e2e.spec.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
