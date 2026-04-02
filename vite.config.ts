import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath, URL } from "url";
import dts from "vite-plugin-dts";
import meta from "./package.json" with { type: "json" };

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const d3Externals = Object.keys(meta.peerDependencies || {}).filter((key) =>
  /^d3-/.test(key),
);

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
  },
  plugins: [
    dts({
      include: ["src/**/*"],
      outDir: "dist",
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: meta.name,
      formats: ["es"],
    },
    rollupOptions: {
      external: d3Externals,
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
});
