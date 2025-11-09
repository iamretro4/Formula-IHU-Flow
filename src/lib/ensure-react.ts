// Utility to ensure React is available before importing libraries that depend on it
export function ensureReactReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    
    // Check if React is already available
    if ((window as any).React && (window as any).React.Children) {
      resolve();
      return;
    }
    
    // Wait for React to be available
    let attempts = 0;
    const maxAttempts = 200; // 2 seconds max
    
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
  });
}

