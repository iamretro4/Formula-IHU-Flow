// Wrapper for recharts that ensures React is available before importing
// Import this instead of recharts directly

// Ensure React is available before importing recharts
if (typeof window !== "undefined") {
  // Wait synchronously for React (with a small timeout to avoid blocking)
  let attempts = 0;
  const maxAttempts = 50; // 500ms max
  
  while (!(window as any).React || !(window as any).React.Children) {
    if (attempts++ > maxAttempts) {
      console.warn('React not available after waiting, proceeding anyway');
      break;
    }
    // Small synchronous delay
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait
    }
  }
}

// Now import recharts - React should be available
export * from "recharts";

