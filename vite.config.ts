import { defineConfig } from "vitest/config";

export default defineConfig({
  publicDir: "public",
  build: {
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        content: "src/content.ts"
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});
