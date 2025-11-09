// CRITICAL: Import React FIRST to ensure react-vendor chunk loads before entry code
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";

// Set React on window immediately
if (typeof window !== "undefined") {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
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

import App from "./App.tsx";
import "./index.css";

// CRITICAL: Initialize React's dispatcher by rendering immediately
// React hooks won't work until React has rendered at least once
// We render to the actual root, not a temporary container
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  
  // Render the app - this initializes React's dispatcher
  // All hooks will now work because React is in a rendering context
  root.render(<App />);
}
