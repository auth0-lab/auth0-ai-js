import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts", "test/**/*.test.ts"],
    // Real-tenant specs run only through vitest.e2e.config.ts (npm run test:e2e).
    exclude: ["**/node_modules/**", "**/dist/**", "test/e2e/**/*.e2e.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
    },
  },
});
