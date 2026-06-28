import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["iife"],
      name: "StructurizrPresenter",
      fileName: () => "runtime.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
    minify: "esbuild",
    sourcemap: true,
  },
});
