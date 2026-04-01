import { defineConfig } from 'vite';
import { resolve } from 'path';
import meta from './package.json' with { type: 'json' };

const d3Externals = Object.keys(meta.peerDependencies || {}).filter(key => /^d3-/.test(key));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      fileName: meta.name,
      formats: ['es'],
    },
    rollupOptions: {
      external: d3Externals,
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
  },
});
