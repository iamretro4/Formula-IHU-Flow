// This module ensures React is available before importing libraries that depend on it
// Import this before importing recharts or @dnd-kit

// Ensure React is available globally
if (typeof window !== "undefined") {
  // Wait for React to be available if it's not yet set
  if (!(window as any).React || !(window as any).React.Children) {
    // Poll for React to be available (should be very fast)
    let attempts = 0;
    const maxAttempts = 100; // 1 second max wait
    
    const checkReact = () => {
      if ((window as any).React && (window as any).React.Children) {
        // React is available, ensure __REACT_CHILDREN__ is set
        if (!(window as any).__REACT_CHILDREN__) {
          (window as any).__REACT_CHILDREN__ = (window as any).React.Children;
        }
        return true;
      }
      attempts++;
      if (attempts < maxAttempts) {
        // Use setTimeout with 0 delay to yield to other code
        setTimeout(checkReact, 10);
        return false;
      }
      return false;
    };
    
    // Start checking
    checkReact();
  } else {
    // React is already available, ensure __REACT_CHILDREN__ is set
    if (!(window as any).__REACT_CHILDREN__) {
      (window as any).__REACT_CHILDREN__ = (window as any).React.Children;
    }
  }
}

// Export a function to ensure React is ready before importing
export function ensureReactReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined") {
      if ((window as any).React && (window as any).React.Children) {
        resolve();
        return;
      }
      
      // Wait for React
      let attempts = 0;
      const maxAttempts = 100;
      const checkReact = () => {
        if ((window as any).React && (window as any).React.Children) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkReact, 10);
        } else {
          // Timeout - resolve anyway (might work)
          resolve();
        }
      };
      checkReact();
    } else {
      resolve();
    }
  });
}

