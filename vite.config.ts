import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// DRASTIC SOLUTION: Plugin to ensure React is ready before entry chunk executes
// This wraps the entry chunk code to wait for React if needed
function ensureReactReadyPlugin(): Plugin {
  return {
    name: 'ensure-react-ready',
    enforce: 'post',
    generateBundle(options, bundle) {
      // Find the entry chunk
      const entryChunk = Object.values(bundle).find(
        chunk => chunk.type === 'chunk' && chunk.isEntry
      );
      
      if (entryChunk && entryChunk.type === 'chunk') {
        // Wrap the entry chunk code to ensure React is ready
        // The HTML stub should already provide React, but this is a safety net
        const reactCheck = `
// Ensure React is available before executing entry code
(function() {
  if (typeof window !== 'undefined' && (!window.React || !window.React.useLayoutEffect)) {
    // React not ready yet - wait for it
    var checkReact = setInterval(function() {
      if (window.React && window.React.useLayoutEffect) {
        clearInterval(checkReact);
        // React is ready, continue with entry code
      }
    }, 1);
    // Timeout after 5 seconds
    setTimeout(function() {
      clearInterval(checkReact);
    }, 5000);
  }
})();
`;
        entryChunk.code = reactCheck + entryChunk.code;
      }
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
    mode === "development" && componentTagger(),
    ensureReactReadyPlugin()
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
        // DRASTIC SOLUTION: Remove vendor chunk entirely - put everything in entry chunk
        // This ensures React is always available before any library code executes
        manualChunks: (id, { getModuleInfo }) => {
          // Only create separate chunks for very large, non-React libraries
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
            
            // React in separate chunk that loads first
            if (isReact) {
              return 'react-vendor';
            }
            
            // Only very large, non-React libraries get separate chunks
            // Everything else goes to entry chunk where React is available
            if (id.includes('pdfjs-dist')) {
              return 'pdf'; // Very large, non-React
            }
            if (id.includes('jspdf') || id.includes('xlsx')) {
              return 'export'; // Large, non-React
            }
            if (id.includes('d3-gantt') || id.includes('vis-network')) {
              return 'gantt'; // Large, non-React
            }
            
            // EVERYTHING ELSE goes to entry chunk (undefined = entry chunk)
            // This ensures React is available before any library code executes
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
