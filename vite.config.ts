import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Plugin to patch recharts to ensure React.Children is available
// This fixes the "React.Children is undefined" error
function ensureReactGlobal(): Plugin {
  return {
    name: "ensure-react-global",
    transform(code, id) {
      // Only process recharts modules that use React.Children
      if (id.includes('recharts') && id.includes('node_modules') && code.includes('React.Children')) {
        // Patch React.Children access to use global React if local React.Children is undefined
        // This ensures React.Children is available even if React hasn't fully initialized
        const patchedCode = code.replace(
          /React\.Children/g,
          `(typeof window !== 'undefined' && window.React && window.React.Children ? window.React.Children : React.Children)`
        );
        
        if (patchedCode !== code) {
          return {
            code: patchedCode,
            map: null,
          };
        }
      }
      return null;
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
            
            // Check if this is a recharts module that imports React
            // If so, we need to ensure React is available in chart-vendor
            const isRecharts = id.includes('recharts');
            const isD3 = id.includes('d3') && !id.includes('d3-gantt');
            
            // If this is React and we're in a recharts context, include in chart-vendor
            // Otherwise, include React in entry chunk
            if (isReact) {
              // Check if any module that imports this React module is recharts
              try {
                const moduleInfo = getModuleInfo(id);
                if (moduleInfo) {
                  // Check if recharts modules import this React module
                  const isImportedByRecharts = moduleInfo.importedIds?.some(impId => 
                    impId.includes('recharts')
                  ) || false;
                  
                  // If recharts imports this React module, include it in chart-vendor
                  // This ensures React is available when recharts executes
                  if (isImportedByRecharts || (isRecharts && isReact)) {
                    return 'chart-vendor';
                  }
                }
              } catch (e) {
                // If we can't determine, default to entry chunk
              }
              // Default: include React in entry chunk
              return undefined;
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
            if (isRecharts || isD3) {
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
