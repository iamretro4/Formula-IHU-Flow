// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// Make React available globally IMMEDIATELY and synchronously
// This MUST happen before any async chunks execute
if (typeof window !== "undefined") {
  // Set React immediately - this is critical
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // Also ensure React.Children is explicitly available
  // Some libraries access it directly and might fail if it's not immediately available
  if (React && React.Children) {
    (window as any).__REACT_CHILDREN__ = React.Children;
    
    // Also create a getter that ensures React.Children is always accessible
    // This helps with libraries that access React.Children before React is fully initialized
    try {
      Object.defineProperty(window, 'React', {
        value: React,
        writable: false,
        configurable: false,
      });
      
      // Ensure React.Children is always available via a getter
      if (!(window as any).React.Children) {
        Object.defineProperty((window as any).React, 'Children', {
          value: React.Children,
          writable: false,
          configurable: false,
        });
      }
    } catch (e) {
      // If defineProperty fails, just set it normally
      (window as any).React = React;
      if (!(window as any).React.Children) {
        (window as any).React.Children = React.Children;
      }
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
  
  // Also set up a global React getter that ensures Children is always available
  // This is a fallback for when libraries access React before it's fully set up
  (window as any).__getReactChildren = function() {
    if ((window as any).React && (window as any).React.Children) {
      return (window as any).React.Children;
    }
    if ((window as any).__REACT_CHILDREN__) {
      return (window as any).__REACT_CHILDREN__;
    }
    return null;
  };
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";

