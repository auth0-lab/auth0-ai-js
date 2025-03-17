import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/interrupts/index.ts", "src/react/index.ts", "src/index.ts"],
    outDir: "dist/",
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: ["#interrupts"],
  },
]);
