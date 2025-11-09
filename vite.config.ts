import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Track which chunks need React - we'll populate this during the build
const chunksNeedingReact = new Set<string>();
const processedModules = new Set<string>();

// Plugin to patch final bundled chunks to use global React
// This fixes the "React.Children is undefined" error by patching after bundling
function ensureReactGlobal(): Plugin {
  return {
    name: "ensure-react-global",
    buildStart() {
      chunksNeedingReact.clear();
      processedModules.clear();
    },
    // Use renderChunk to patch the final bundled code (after minification)
    // This is more reliable than transform because it works on the final output
    renderChunk(code, chunk, options) {
      // Only patch chunks that contain recharts or @dnd-kit
      // Check by filename (most reliable after bundling)
      const fileName = chunk.fileName || '';
      const isChartVendor = fileName.includes('chart-vendor');
      const isKanban = fileName.includes('kanban');
      
      if (!isChartVendor && !isKanban) {
        return null;
      }
      
      let patchedCode = code;
      let modified = false;
      
      // First, add a safety check at the very beginning of the chunk
      // This ensures React.Children is available before any code executes
      // Use an IIFE that runs immediately and waits for React if needed
      const safetyCheck = `
(function() {
  'use strict';
  // Wait for React to be available if it's not yet ready
  var getReact = function() {
    if (typeof window !== 'undefined' && window.React && window.React.Children) {
      return window.React;
    }
    if (typeof globalThis !== 'undefined' && globalThis.React && globalThis.React.Children) {
      return globalThis.React;
    }
    // If React is not available, try to get it from __REACT_CHILDREN__
    if (typeof window !== 'undefined' && window.__REACT_CHILDREN__) {
      // Create a minimal React object with Children
      return { Children: window.__REACT_CHILDREN__ };
    }
    return null;
  };
  
  var React = getReact();
  if (!React && typeof window !== 'undefined' && window.__REACT_READY__) {
    // Wait for React to be ready (this should be very fast)
    window.__REACT_READY__.then(function(r) {
      if (r && r.Children && typeof window !== 'undefined') {
        window.__REACT_CHILDREN__ = r.Children;
      }
    }).catch(function() {});
  }
  
  // Make React.Children available as a fallback
  if (React && React.Children && typeof window !== 'undefined') {
    window.__REACT_CHILDREN__ = React.Children;
  }
})();
`;
      
      // Always add safety check for chart-vendor and kanban chunks
      // Check if we need to patch - look for Children references
      if (code.includes('Children') || isChartVendor || isKanban) {
        // Patch the original code FIRST (before adding safety check)
        // Create a unique marker to prevent recursive replacements
        const marker = '__REACT_CHILDREN_SAFE_MARKER__';
        let originalCode = code;
        
        // First, replace with a marker to avoid recursive replacements
        originalCode = originalCode.replace(
          /React\.Children/g,
          marker + '_DOT_Children'
        );
        
        originalCode = originalCode.replace(
          /React\["Children"\]/g,
          marker + '_BRACKET_Children'
        );
        
        originalCode = originalCode.replace(
          /React\['Children'\]/g,
          marker + '_SQUOTE_Children'
        );
        
        // Now replace the marker with the safe accessor (only once)
        const safeAccessor = `((typeof window !== 'undefined' && window.React && window.React.Children) || (typeof window !== 'undefined' && window.__REACT_CHILDREN__) || (typeof React !== 'undefined' && React.Children) || (() => { throw new Error('React.Children is not available'); })())`;
        originalCode = originalCode.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_DOT_Children', 'g'), safeAccessor);
        originalCode = originalCode.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_BRACKET_Children', 'g'), safeAccessor);
        originalCode = originalCode.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_SQUOTE_Children', 'g'), safeAccessor);
        
        // Now add safety check at the beginning of the patched code
        patchedCode = safetyCheck + originalCode;
        modified = true;
      }
      
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

// Plugin to inject React setup script into HTML and ensure proper loading
function injectReactSetup(): Plugin {
  return {
    name: "inject-react-setup",
    transformIndexHtml(html) {
      // Inject a script that ensures React is available before any modules load
      // This script will run synchronously before the entry module
      const reactSetupScript = `
    <script>
      // Ensure React is available globally before any chunks execute
      // This prevents "React.Children is undefined" errors in async chunks
      (function() {
        if (typeof window !== 'undefined') {
          // Create a promise that resolves when React is available
          var reactResolver = null;
          window.__REACT_READY__ = new Promise(function(resolve) {
            reactResolver = resolve;
            // Check immediately
            if (window.React && window.React.Children) {
              resolve(window.React);
            } else {
              // Poll until React is available
              var checkReact = function() {
                if (window.React && window.React.Children) {
                  resolve(window.React);
                } else {
                  setTimeout(checkReact, 10);
                }
              };
              checkReact();
            }
          });
          // Store resolver for react-init.ts to use
          (window as any).__REACT_RESOLVER__ = reactResolver;
        }
      })();
    </script>
`;
      // Insert before the module script
      return html.replace(
        /<script type="module" src="([^"]+)"><\/script>/,
        reactSetupScript + '\n    <script type="module" src="$1"></script>'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8000,
  },
  plugins: [
    react(),
    ensureReactGlobal(),
    injectReactSetup(),
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
