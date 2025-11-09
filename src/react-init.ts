// This module ensures React is available globally
// Import this FIRST in main.tsx
import * as React from "react";
import * as ReactDOM from "react-dom";

// Set React on window immediately - this is synchronous
if (typeof window !== "undefined") {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // Also set on other global scopes
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).React = React;
  }
  if (typeof global !== 'undefined') {
    (global as any).React = React;
  }
  if (typeof self !== 'undefined') {
    (self as any).React = React;
  }
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";


