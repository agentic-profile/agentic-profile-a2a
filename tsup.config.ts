import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"], // Build for commonJS and ESmodules
    dts: {
        resolve: true,
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    target: "esnext"
});