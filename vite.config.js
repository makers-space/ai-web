import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8093
  },
  optimizeDeps: {
    include: ['mammoth'],
    // Exclude the PDF.js worker from Vite's pre-bundling so the
    // `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`
    // pattern in PdfViewer resolves correctly at runtime.
    exclude: ['pdfjs-dist']
  },
  css: {
    // CSS preprocessing
    preprocessorOptions: {
      // Add additional preprocessing options if needed
    },
    // Make sure CSS modules are properly processed
    modules: {
      scopeBehaviour: 'global'
    }
  },
  resolve: {
    alias: {
      // y-monaco@0.1.6 imports monaco-editor's pre-exports-map deep path.
      // monaco-editor >=0.52 maps "./*" to "./esm/vs/*.js", so the legacy
      // specifier resolves to a doubled esm/vs/ path. Rolldown (Vite 8)
      // enforces the exports map where esbuild did not, so rewrite it to the
      // supported subpath. Remove once y-monaco ships a fixed import.
      'monaco-editor/esm/vs/editor/editor.api.js': 'monaco-editor/editor/editor.api.js',
      '@': path.resolve(import.meta.dirname, './src'),
      '@components': path.resolve(import.meta.dirname, './src/components'),
      '@themes': path.resolve(import.meta.dirname, './src/themes'),
      '@contexts': path.resolve(import.meta.dirname, './src/contexts'),
      '@pages': path.resolve(import.meta.dirname, './src/pages'),
      '@styles': path.resolve(import.meta.dirname, './src/styles'),
      '@utils': path.resolve(import.meta.dirname, './src/utils'),
      '@service': path.resolve(import.meta.dirname, './src/service')
    }
  }
});
