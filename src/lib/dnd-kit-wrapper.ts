// Wrapper for @dnd-kit that ensures React is available before importing
// Import this instead of @dnd-kit directly

// Ensure React is available before importing @dnd-kit
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

// Now export @dnd-kit modules - React should be available
export * from "@dnd-kit/core";
export * from "@dnd-kit/sortable";
export * from "@dnd-kit/utilities";

