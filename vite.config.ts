import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].${Date.now()}.js`,
        chunkFileNames: `assets/[name].[hash].${Date.now()}.js`,
        assetFileNames: (assetInfo) => {
          // Keep PDF files in root with original name (for template access)
          if (assetInfo.name && assetInfo.name.endsWith('.pdf')) {
            return '[name][extname]';
          }
          return `assets/[name].[hash].${Date.now()}.[ext]`;
        }
      }
    }
  },
  publicDir: 'public',
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['pdf-parse', 'mammoth', 'pdf-lib']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'es2015'
  },
  server: {
    fs: {
      strict: false
    }
  }
})
