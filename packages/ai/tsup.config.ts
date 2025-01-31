import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
  {
    entry: ["src/utils/index.ts"],
    outDir: "utils/dist",
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
]);
