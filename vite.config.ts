import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Track which chunks need React - we'll populate this during the build
const chunksNeedingReact = new Set<string>();
const processedModules = new Set<string>();

// Plugin to patch final bundled chunks to use global React.Children
// This works with the HTML stub to ensure React.Children is always available
function ensureReactGlobal(): Plugin {
  return {
    name: "ensure-react-global",
    buildStart() {
      chunksNeedingReact.clear();
      processedModules.clear();
    },
    // Use renderChunk to patch the final bundled code (after minification)
    renderChunk(code, chunk, options) {
      // Only patch chunks that contain recharts or @dnd-kit
      const fileName = chunk.fileName || '';
      const isChartVendor = fileName.includes('chart-vendor');
      const isKanban = fileName.includes('kanban');
      
      if (!isChartVendor && !isKanban) {
        return null;
      }
      
      // Check if code references React.Children
      if (!code.includes('Children')) {
        return null;
      }
      
      let patchedCode = code;
      let modified = false;
      
      // Create a unique marker to prevent recursive replacements
      // Use a static marker that won't appear in the actual code
      const marker = '__REACT_CHILDREN_SAFE_MARKER_XYZ123__';
      
      // Step 1: Replace all React.Children references with markers
      patchedCode = patchedCode.replace(
        /React\.Children/g,
        marker + '_DOT'
      );
      
      patchedCode = patchedCode.replace(
        /React\["Children"\]/g,
        marker + '_BRACKET'
      );
      
      patchedCode = patchedCode.replace(
        /React\['Children'\]/g,
        marker + '_SQUOTE'
      );
      
      // Step 2: Replace markers with safe accessor that uses the HTML stub
      // The stub in index.html ensures window.React.Children is always available
      const safeAccessor = `(typeof window !== 'undefined' && window.React && window.React.Children ? window.React.Children : (typeof window !== 'undefined' && window.__REACT_CHILDREN__ ? window.__REACT_CHILDREN__ : (typeof React !== 'undefined' && React.Children ? React.Children : (() => { throw new Error('React.Children is not available'); })())))`;
      
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      patchedCode = patchedCode.replace(new RegExp(escapedMarker + '_DOT', 'g'), safeAccessor);
      patchedCode = patchedCode.replace(new RegExp(escapedMarker + '_BRACKET', 'g'), safeAccessor);
      patchedCode = patchedCode.replace(new RegExp(escapedMarker + '_SQUOTE', 'g'), safeAccessor);
      
      modified = true;
      
      if (modified) {
        return {
          code: patchedCode,
          map: null, // Don't generate source maps for patched chunks
        };
      }
      
      return null;
    },
  };
}

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
    ensureReactGlobal(),
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
            
            // Radix UI components - put in separate chunk
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            
            // Recharts and d3 - put in chart-vendor chunk
            // Keep React in entry, but ensure chart-vendor can access it
            if (id.includes('recharts') || (id.includes('d3') && !id.includes('d3-gantt'))) {
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
            // @dnd-kit - put in kanban chunk
            // Keep React in entry, but ensure kanban can access it
            if (id.includes('@dnd-kit')) {
              return 'kanban';
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
