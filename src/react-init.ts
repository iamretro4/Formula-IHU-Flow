// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// CRITICAL: Replace the stub with the real React immediately and synchronously
// This MUST happen before any other module code executes
// DRASTIC SOLUTION: Block execution until React is fully set
if (typeof window !== "undefined") {
  // Set React immediately - this is synchronous and blocks until complete
  const reactModule = React;
  const reactDOMModule = ReactDOM;
  
  // CRITICAL: Set React synchronously and verify it's accessible
  // Force set React on all global scopes immediately
  try {
    // Use the setter (created by HTML script) to replace the stub
    (window as any).React = reactModule;
    
    // Verify React is accessible
    if (!(window as any).React || !(window as any).React.useLayoutEffect) {
      // Force set directly if setter didn't work
      (window as any).React = reactModule;
    }
  } catch (e) {
    // If setter fails, try direct assignment
    try {
      Object.assign((window as any).React, reactModule);
    } catch (e2) {
      // If that fails, just set it directly (might overwrite getter/setter)
      (window as any).React = reactModule;
    }
  }
  
  // Also set on all other global scopes immediately
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).React = reactModule;
  }
  if (typeof global !== 'undefined') {
    (global as any).React = reactModule;
  }
  if (typeof self !== 'undefined') {
    (self as any).React = reactModule;
  }
  
  (window as any).ReactDOM = reactDOMModule;
  
  // Replace the stub with the real React.Children
  if (React && React.Children) {
    const reactObj = (window as any).React;

    // Use the setter (created by HTML script) to replace the stub
    try {
      reactObj.Children = React.Children;
    } catch (e) {
      // If setter fails, try to set Children directly
      try {
        if (Object.isExtensible(reactObj)) {
          reactObj.Children = React.Children;
        } else {
          // Object is frozen/sealed, use the getter/setter mechanism
          // The HTML script's getter will return realChildren when available
          // Just cache it for the getter to use
          (window as any).__REACT_CHILDREN__ = React.Children;
        }
      } catch (e2) {
        // Last resort: just cache it
        (window as any).__REACT_CHILDREN__ = React.Children;
      }
    }

    // Also cache it for direct access
    (window as any).__REACT_CHILDREN__ = React.Children;

    // Try to ensure Children is accessible (only if object is extensible)
    if (Object.isExtensible(reactObj) && !reactObj.Children) {
      try {
        reactObj.Children = React.Children;
      } catch (e) {
        // Ignore - will use cached version
      }
    }
  }
  
  // DRASTIC: Verify React is fully accessible before continuing
  // This blocks module execution until React is ready
  if (!(window as any).React || !(window as any).React.useLayoutEffect) {
    // This should never happen, but if it does, throw an error
    console.error('CRITICAL: React is not accessible after react-init.ts execution');
    throw new Error('React initialization failed');
  }
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";


