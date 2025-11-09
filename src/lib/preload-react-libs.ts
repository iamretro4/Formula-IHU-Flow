// Preload module that ensures React is ready before loading problematic libraries
// Import this at the very top of files that use recharts or @dnd-kit

// Wait for React to be fully available
function waitForReact(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    
    // Check if React is already available
    const checkReact = () => {
      const react = (window as any).React;
      if (react && react.Children && typeof react.Children.map === 'function') {
        resolve();
      } else {
        // Wait a bit and check again
        setTimeout(checkReact, 5);
      }
    };
    
    // Start checking immediately
    checkReact();
    
    // Timeout after 1 second
    setTimeout(() => resolve(), 1000);
  });
}

// Preload recharts after React is ready
let rechartsPromise: Promise<any> | null = null;
export function preloadRecharts() {
  if (!rechartsPromise) {
    rechartsPromise = waitForReact().then(() => import("recharts"));
  }
  return rechartsPromise;
}

// Preload @dnd-kit after React is ready
let dndKitPromise: Promise<any> | null = null;
export function preloadDndKit() {
  if (!dndKitPromise) {
    dndKitPromise = waitForReact().then(async () => {
      const [core, sortable, utilities] = await Promise.all([
        import("@dnd-kit/core"),
        import("@dnd-kit/sortable"),
        import("@dnd-kit/utilities")
      ]);
      return { ...core, ...sortable, ...utilities };
    });
  }
  return dndKitPromise;
}

// Start preloading immediately when this module loads
if (typeof window !== "undefined") {
  // Preload in the background
  preloadRecharts();
  preloadDndKit();
}

