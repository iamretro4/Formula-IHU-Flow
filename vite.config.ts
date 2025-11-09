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
        // COMPLETELY DIFFERENT APPROACH: Put React in separate chunk that loads FIRST
        // This ensures React is fully loaded before entry chunk executes
        manualChunks: (id, { getModuleInfo }) => {
          if (id.includes('node_modules')) {
            // React MUST be in separate chunk that loads first
            const isReact = 
              (id.includes('/react/') && id.includes('node_modules')) || 
              (id.includes('\\react\\') && id.includes('node_modules')) ||
              (id.includes('/react-dom/') && id.includes('node_modules')) || 
              (id.includes('\\react-dom\\') && id.includes('node_modules')) ||
              (id.includes('/react/jsx-runtime') && id.includes('node_modules')) ||
              (id.includes('\\react\\jsx-runtime') && id.includes('node_modules')) ||
              (id.includes('/react-dom/client') && id.includes('node_modules')) ||
              (id.includes('\\react-dom\\client') && id.includes('node_modules'));
            
            if (isReact) {
              return 'react-vendor'; // Separate chunk that loads first
            }
            
            // React Router depends on React
            if (id.includes('react-router')) {
              return 'react-vendor';
            }
            
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
            
            // Everything else goes to entry chunk
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
