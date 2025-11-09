// CRITICAL: Import React FIRST to ensure react-vendor chunk loads before entry code
// This ensures React is fully loaded and available before any other code executes
import * as React from "react";
import * as ReactDOM from "react-dom";

// Set React on window immediately so other code can access it
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

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render the app - React is now guaranteed to be loaded from react-vendor chunk
createRoot(document.getElementById("root")!).render(<App />);
