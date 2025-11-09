import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Plugin to ensure React vendor chunk is preloaded first in HTML
function reactVendorPreload(): Plugin {
  return {
    name: "react-vendor-preload",
    transformIndexHtml(html, ctx) {
      if (!ctx || !ctx.bundle) return html;
      
      // Find react-vendor chunk in bundle
      const reactVendorChunk = Object.values(ctx.bundle).find(
        (chunk) => chunk.type === "chunk" && chunk.name === "react-vendor"
      );
      
      if (reactVendorChunk && reactVendorChunk.type === "chunk") {
        const reactVendorPath = reactVendorChunk.fileName;
        // Remove any existing react-vendor modulepreload and add it first
        // This ensures React loads before other vendor chunks
        html = html.replace(
          new RegExp(`<link rel="modulepreload"[^>]*href="/${reactVendorPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g'),
          ''
        );
        // Add react-vendor modulepreload right after the entry script
        return html.replace(
          /(<script type="module"[^>]*src="[^"]*index-[^"]*\.js"[^>]*><\/script>)/,
          `$1\n    <link rel="modulepreload" crossorigin href="/${reactVendorPath}" />`
        );
      }
      return html;
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
    reactVendorPreload(),
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
            // React and React-DOM - Put in dedicated chunk that loads first
            // This prevents "forwardRef" and "Children" undefined errors
            const isReact = 
              (id.includes('/react/') && id.includes('node_modules')) || 
              (id.includes('\\react\\') && id.includes('node_modules')) ||
              (id.includes('/react-dom/') && id.includes('node_modules')) || 
              (id.includes('\\react-dom\\') && id.includes('node_modules')) ||
              (id.includes('/react/jsx-runtime') && id.includes('node_modules')) ||
              (id.includes('\\react\\jsx-runtime') && id.includes('node_modules')) ||
              (id.includes('/react-dom/client') && id.includes('node_modules')) ||
              (id.includes('\\react-dom\\client') && id.includes('node_modules'));
            
            // Put React in dedicated chunk that loads first
            // This prevents "forwardRef" and "Children" undefined errors
            // The reactVendorPreload plugin ensures this chunk is preloaded
            if (isReact) {
              return 'react-vendor';
            }
            // React Router depends on React - include in react-vendor
            if (id.includes('react-router')) {
              return 'react-vendor';
            }
            // Radix UI components - put in separate chunk but ensure React is loaded first
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts') || id.includes('d3')) {
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
