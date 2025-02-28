import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/authorizers/federated-connections/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
]);
