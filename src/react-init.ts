// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// Make React available globally IMMEDIATELY
if (typeof window !== "undefined") {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";

