import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Track which chunks need React - we'll populate this during the build
const chunksNeedingReact = new Set<string>();
const processedModules = new Set<string>();

// No patching needed - rely entirely on HTML stub
// The stub in index.html creates window.React.Children before any chunks load

// Plugin removed - we now use the stub in index.html directly
// This was causing conflicts with the HTML stub approach

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
        manualChunks: (id, { getModuleInfo }) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            const isReact = 
              (id.includes('/react/') && id.includes('node_modules')) || 
              (id.includes('\\react\\') && id.includes('node_modules')) ||
              (id.includes('/react-dom/') && id.includes('node_modules')) || 
              (id.includes('\\react-dom\\') && id.includes('node_modules')) ||
              (id.includes('/react/jsx-runtime') && id.includes('node_modules')) ||
              (id.includes('\\react\\jsx-runtime') && id.includes('node_modules')) ||
              (id.includes('/react-dom/client') && id.includes('node_modules')) ||
              (id.includes('\\react-dom\\client') && id.includes('node_modules'));
            
            // CRITICAL: React MUST be in entry chunk to ensure it loads first
            // We'll use the plugin to patch recharts/@dnd-kit to use global React
            if (isReact) {
              return undefined; // Always include React in entry chunk
            }
            
            // React Router depends on React - also include in entry
            if (id.includes('react-router')) {
              return undefined; // Include in entry chunk
            }
            
            // Radix UI - don't put in separate chunk, let it load with entry
            // This prevents it from executing before React is ready
            if (id.includes('@radix-ui')) {
              return undefined; // Include in entry chunk so React loads first
            }
            
            // Recharts - don't put in separate chunk, let it load dynamically
            // This prevents it from being bundled until actually needed
            if (id.includes('recharts')) {
              return undefined; // Include in entry or let it be dynamically imported
            }
            // d3 - put in chart-vendor chunk (but not recharts)
            if (id.includes('d3') && !id.includes('d3-gantt')) {
              return 'chart-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'form-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // @dnd-kit - don't put in separate chunk, let it load dynamically
            // This prevents it from being bundled until actually needed
            if (id.includes('@dnd-kit')) {
              return undefined; // Include in entry or let it be dynamically imported
            }
            if (id.includes('d3-gantt') || id.includes('vis-network')) {
              return 'gantt';
            }
            if (id.includes('pdfjs-dist')) {
              return 'pdf';
            }
            if (id.includes('jspdf') || id.includes('xlsx')) {
              return 'export';
            }
            // Other large vendor libraries
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('date-fns')) {
              return 'date-utils';
            }
            // Default vendor chunk for other node_modules
            return 'vendor';
          }
        },
        // Ensure proper chunk loading order
        // React vendor will be loaded first due to dependencies
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Ensure React vendor is loaded before other vendor chunks
        // This is handled automatically by Rollup through chunk dependencies
        // Use manualChunks to create a react-vendor chunk that loads first
        // All React-dependent libraries will depend on react-vendor
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
