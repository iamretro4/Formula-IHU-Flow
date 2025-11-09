// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// COMPLETELY DIFFERENT APPROACH: Set React and ensure Children is always available
// This runs synchronously before any other code
if (typeof window !== "undefined") {
  // Set React immediately
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // CRITICAL: Set React.Children - use the setter if it exists, otherwise direct assignment
  if (React && React.Children) {
    // Try to use the setter first (if HTML script created one)
    try {
      (window as any).React.Children = React.Children;
    } catch (e) {
      // If setter fails, set directly
      const reactObj = (window as any).React;
      if (reactObj) {
        reactObj.__realChildren = React.Children;
        reactObj.Children = React.Children;
      }
    }
    
    // Also cache it
    (window as any).__REACT_CHILDREN__ = React.Children;
    
    // Force ensure it's set
    if (!(window as any).React.Children) {
      (window as any).React.Children = React.Children;
    }
  }
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";

