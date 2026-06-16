import { defineConfig } from "vite";
import path from "path";

export default defineConfig(async () => {
  const plugins = [];

  // Uključi bundle analyzer samo kad pokreneš ANALYZE=true
  if (process.env.ANALYZE === "true") {
    const { visualizer } = await import("rollup-plugin-visualizer");
    plugins.push(
      visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  return {
    base: "./",
    publicDir: "public",

    plugins,

    resolve: {
      alias: {
        "@app": path.resolve(__dirname, "viewer/app"),
        "@engine": path.resolve(__dirname, "viewer/engine"),
        "@ui": path.resolve(__dirname, "viewer/ui"),
        "@shared": path.resolve(__dirname, "viewer/shared"),
      },
    },

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: "all",
    },

    build: {
      outDir: "dist",
      assetsDir: "assets",
      emptyOutDir: true,
    },
  };
});