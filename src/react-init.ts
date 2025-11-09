// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// Make React available globally IMMEDIATELY and synchronously
// This MUST happen before any async chunks execute
if (typeof window !== "undefined") {
  // Set React immediately - this is critical
  // Replace the placeholder with the real React
  const existingReact = (window as any).React;
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // Ensure React.Children is explicitly available
  // This is critical for libraries that access it directly
  if (React && React.Children) {
    (window as any).React.Children = React.Children;
    (window as any).__REACT_CHILDREN__ = React.Children;
    
    // Also ensure it's not null/undefined (replace placeholder if needed)
    if (!(window as any).React.Children) {
      (window as any).React.Children = React.Children;
    }
  }
  
  // Signal that React is ready by resolving the promise if it exists
  if ((window as any).__REACT_RESOLVER__) {
    try {
      (window as any).__REACT_RESOLVER__(React);
    } catch (e) {
      // Promise already resolved, ignore
    }
  }
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";

