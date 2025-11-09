import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8000,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'], // Ensure single instance of React
  },
  build: {
    sourcemap: false, // Disable source maps in production
    cssCodeSplit: true, // Split CSS for better caching
    rollupOptions: {
      output: {
        // Ensure proper chunk loading order
        // React vendor will be loaded before UI vendor due to dependencies
        // FINAL APPROACH: Put React in entry chunk with everything else
        // This ensures React loads and renders before any other code executes
        // React MUST be in the same chunk as the entry code to guarantee execution order
        manualChunks: (id, { getModuleInfo }) => {
          if (id.includes('node_modules')) {
            // CRITICAL: Put React in entry chunk (undefined) to ensure it executes first
            // This guarantees React is loaded and can render before any other code runs
            
            // Only very large, non-React libraries get separate chunks
            if (id.includes('pdfjs-dist')) {
              return 'pdf';
            }
            if (id.includes('jspdf') || id.includes('xlsx')) {
              return 'export';
            }
            if (id.includes('d3-gantt') || id.includes('vis-network')) {
              return 'gantt';
            }
            
            // EVERYTHING ELSE (including React) goes to entry chunk
            // This ensures React loads first and can render before other code executes
            return undefined;
          }
        },
        // Ensure proper chunk loading order
        // React vendor will be loaded first due to dependencies
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Ensure react-vendor chunk loads before other vendor chunks
        // This is handled by making other chunks depend on react-vendor
        // Also ensure entry chunk loads before vendor chunk
        // This ensures React is initialized before vendor code executes
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
    reportCompressedSize: false, // Faster builds
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "@radix-ui/react-slot",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
    ],
    exclude: ['@tanstack/react-virtual'],
    esbuildOptions: {
      sourcemap: false,
      target: 'esnext',
    },
    force: false, // Set to true if you need to force re-optimization
  },
}));
