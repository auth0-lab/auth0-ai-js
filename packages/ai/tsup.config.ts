import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/authorizers/federated-connections/index.ts",
      "src/authorizers/ciba/index.ts",
      "src/authorizers/fga/index.ts",
    ],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
]);
