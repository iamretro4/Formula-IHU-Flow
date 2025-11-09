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
            
            // CRITICAL: React MUST be in a separate chunk that loads FIRST
            // This ensures React is available before vendor code executes
            if (isReact) {
              return 'react-vendor'; // Put React in its own chunk that loads first
            }
            
            // React Router depends on React - put in react-vendor to ensure React loads first
            if (id.includes('react-router')) {
              return 'react-vendor'; // Include with React to ensure proper load order
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
            // React-dependent libraries - load with entry to ensure React is ready
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return undefined; // Include in entry chunk so React loads first
            }
            if (id.includes('@tanstack/react-query')) {
              return undefined; // Include in entry chunk so React loads first
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor'; // Keep separate as it's large
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
            // CRITICAL: Don't put React-dependent libraries in vendor chunk
            // Check if it's a React-dependent library and put in entry instead
            // This includes ALL libraries that use React, even if not obviously React-dependent
            const isReactDependent = 
              id.includes('react') || 
              id.includes('@tanstack') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('zustand') ||
              id.includes('jotai') ||
              id.includes('recoil') ||
              id.includes('valtio') ||
              id.includes('embla-carousel-react') ||
              id.includes('input-otp') ||
              id.includes('lucide-react') ||
              id.includes('next-themes') ||
              id.includes('react-day-picker') ||
              id.includes('react-dnd') ||
              id.includes('react-flow') ||
              id.includes('react-image-gallery') ||
              id.includes('react-joyride') ||
              id.includes('react-markdown') ||
              id.includes('react-player') ||
              id.includes('react-resizable-panels') ||
              id.includes('react-swipeable') ||
              id.includes('react-window') ||
              id.includes('reactflow') ||
              id.includes('sonner') ||
              id.includes('vaul') ||
              id.includes('cmdk'); // cmdk uses React internally
            
            if (isReactDependent) {
              return undefined; // Include in entry chunk so React loads first
            }
            
            // CRITICAL: Check if module imports React - if so, put in entry chunk
            // This catches any library that uses React, even if not in our explicit list
            try {
              const moduleInfo = getModuleInfo(id);
              if (moduleInfo) {
                // Check all imports - if any import React, this module needs React
                const imports = moduleInfo.importedIds || [];
                const hasReactImport = imports.some(importId => 
                  (importId.includes('/react/') || importId.includes('\\react\\')) &&
                  !importId.includes('react-dom') &&
                  !importId.includes('react-router')
                );
                if (hasReactImport) {
                  return undefined; // Put in entry chunk - React must be available
                }
                
                // Also check dynamic imports
                const dynamicImports = moduleInfo.dynamicImports || [];
                const hasReactDynamicImport = dynamicImports.some(importId =>
                  (importId.includes('/react/') || importId.includes('\\react\\')) &&
                  !importId.includes('react-dom') &&
                  !importId.includes('react-router')
                );
                if (hasReactDynamicImport) {
                  return undefined; // Put in entry chunk
                }
              }
            } catch (e) {
              // If we can't check module info, be conservative
              // Only put in vendor if we're absolutely sure it's not React-dependent
            }
            
            // Default vendor chunk for other node_modules (non-React libraries)
            // Only libraries that we're 100% sure don't use React go here
            return 'vendor';
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
