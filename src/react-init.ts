// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// Make React available globally IMMEDIATELY and synchronously
// This MUST happen before any async chunks execute
if (typeof window !== "undefined") {
  // Set React immediately - this is critical
  // Replace the placeholder with the real React
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // CRITICAL: Ensure React.Children is explicitly set and accessible
  // This must happen immediately and cannot fail
  if (React && React.Children) {
    // Set it multiple ways to ensure it's always available
    (window as any).React.Children = React.Children;
    (window as any).__REACT_CHILDREN__ = React.Children;
    
    // Force set it again to override any getters
    try {
      Object.defineProperty((window as any).React, 'Children', {
        value: React.Children,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      // If defineProperty fails, the direct assignment above should work
      (window as any).React.Children = React.Children;
    }
    
    // Double-check it's set
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

