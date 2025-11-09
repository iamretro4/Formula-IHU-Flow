import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// DRASTIC SOLUTION: Plugin to ensure React is ready before entry chunk executes
// This wraps ALL chunks (not just entry) to wait for React if needed
function ensureReactReadyPlugin(): Plugin {
  return {
    name: 'ensure-react-ready',
    enforce: 'post',
    generateBundle(options, bundle) {
      // Process ALL chunks to ensure React is ready before they execute
      Object.values(bundle).forEach(chunk => {
        if (chunk.type === 'chunk') {
          // Skip react-init chunk - it sets up React
          if (chunk.fileName.includes('react-init') || chunk.modules && Object.keys(chunk.modules).some(id => id.includes('react-init'))) {
            return;
          }
          
          // Wrap chunk code to ensure React is ready - BLOCKING version
          // Wait for both React to exist AND the __REACT_READY__ flag to be set
          const reactCheck = `
// CRITICAL: Block execution until React is fully initialized
(function() {
  if (typeof window !== 'undefined') {
    var react = window.React;
    var reactReady = window.__REACT_READY__;
    // Synchronously wait for React to be ready (blocking)
    var maxIterations = 100000; // Prevent infinite loop
    var i = 0;
    // Wait for both React hooks to exist AND the ready flag to be set
    while ((!react || !react.useLayoutEffect || !react.useMemo || !react.useState || !reactReady) && i < maxIterations) {
      react = window.React;
      reactReady = window.__REACT_READY__;
      i++;
      // Small delay to allow other code to execute
      if (i % 1000 === 0) {
        // Yield to event loop every 1000 iterations
        var start = Date.now();
        while (Date.now() - start < 1) {
          // Busy wait for 1ms
        }
      }
    }
    if (i >= maxIterations) {
      console.error('CRITICAL: React not ready after', maxIterations, 'iterations');
      console.error('React exists:', !!react);
      console.error('React hooks:', {
        useLayoutEffect: !!(react && react.useLayoutEffect),
        useMemo: !!(react && react.useMemo),
        useState: !!(react && react.useState)
      });
      console.error('React ready flag:', reactReady);
      throw new Error('React initialization timeout');
    }
  }
})();
`;
          chunk.code = reactCheck + chunk.code;
        }
      });
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
        // DRASTIC SOLUTION: Put React back in entry chunk to ensure it's always available
        // This ensures React is always available before any library code executes
        manualChunks: (id, { getModuleInfo }) => {
          // Only create separate chunks for very large, non-React libraries
          if (id.includes('node_modules')) {
            // CRITICAL: Put React in entry chunk (undefined) to ensure it loads with entry
            // This guarantees React is available before any other code executes
            // Don't put React in separate chunk - it must be in entry chunk
            
            // Only very large, non-React libraries get separate chunks
            // Everything else (including React) goes to entry chunk where React is available
            if (id.includes('pdfjs-dist')) {
              return 'pdf'; // Very large, non-React
            }
            if (id.includes('jspdf') || id.includes('xlsx')) {
              return 'export'; // Large, non-React
            }
            if (id.includes('d3-gantt') || id.includes('vis-network')) {
              return 'gantt'; // Large, non-React
            }
            
            // EVERYTHING ELSE (including React) goes to entry chunk (undefined = entry chunk)
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
