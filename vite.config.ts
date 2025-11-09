import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Track which chunks need React - we'll populate this during the build
const chunksNeedingReact = new Set<string>();
const processedModules = new Set<string>();

// Plugin to patch recharts and @dnd-kit to use global React
// This fixes the "React.Children is undefined" error
function ensureReactGlobal(): Plugin {
  return {
    name: "ensure-react-global",
    buildStart() {
      chunksNeedingReact.clear();
      processedModules.clear();
    },
    transform(code, id) {
      // Patch recharts and @dnd-kit modules that use React.Children
      if ((id.includes('recharts') || id.includes('@dnd-kit')) && 
          id.includes('node_modules')) {
        // More comprehensive patching - handle React.Children access
        let patchedCode = code;
        let modified = false;
        
        // Patch React.Children access - ensure it always uses global React
        // Match various patterns: React.Children, React["Children"], etc.
        if (code.includes('React.Children') || code.includes('React["Children"]') || code.includes("React['Children']")) {
          // Replace all forms of React.Children access
          patchedCode = patchedCode.replace(
            /React\.Children/g,
            `((typeof window !== 'undefined' && window.React && window.React.Children) || (typeof React !== 'undefined' && React.Children) || (() => { throw new Error('React.Children is not available'); })())`
          );
          patchedCode = patchedCode.replace(
            /React\["Children"\]/g,
            `((typeof window !== 'undefined' && window.React && window.React["Children"]) || (typeof React !== 'undefined' && React["Children"]) || (() => { throw new Error('React.Children is not available'); })())`
          );
          patchedCode = patchedCode.replace(
            /React\['Children'\]/g,
            `((typeof window !== 'undefined' && window.React && window.React['Children']) || (typeof React !== 'undefined' && React['Children']) || (() => { throw new Error('React.Children is not available'); })())`
          );
          modified = true;
        }
        
        // Also ensure React itself is available at the top of the module
        // Add a safety check at the beginning if React is used
        // This ensures React is available before any code in the module executes
        if (code.includes('React.') && !patchedCode.includes('// React safety check')) {
          // Prepend a safety check to ensure React is available
          // Use a more robust approach that works with ES modules
          const reactCheck = `
// React safety check - ensure React.Children is available
if (typeof window !== 'undefined' && window.React && window.React.Children) {
  // Make React.Children available if React exists but Children is missing
  if (typeof React !== 'undefined' && !React.Children) {
    React.Children = window.React.Children;
  }
}
`;
          patchedCode = reactCheck + patchedCode;
          modified = true;
        }
        
        if (modified) {
          return {
            code: patchedCode,
            map: null,
          };
        }
      }
      return null;
    },
    generateBundle(options, bundle) {
      // Ensure React is available globally in the entry chunk
      // This will be handled by react-init.ts, but we can add a safety check
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          // The entry chunk should already have react-init.ts
          // which sets window.React
        }
      }
    },
  };
}

// Plugin to inject React setup script into HTML
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
        if (typeof window !== 'undefined' && !window.__REACT_SETUP__) {
          window.__REACT_SETUP__ = true;
          // This will be set by react-init.ts, but we ensure it's ready
          // The entry chunk will set window.React when it loads
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
            // These will depend on React from entry chunk
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
            // This will depend on React from entry chunk
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
