// CRITICAL: React MUST be loaded and available globally FIRST
// This prevents "forwardRef" and "Children" undefined errors in vendor chunks
// Import React synchronously at the very top - this ensures it's initialized
// before any other modules (like chart-vendor) can execute
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Make React available globally IMMEDIATELY after import
// This ensures React.Children and React.forwardRef are available
// when vendor chunks (like chart-vendor with recharts) execute
if (typeof window !== "undefined") {
  (window as any).React = React;
  // Also ensure ReactDOM is available
  (window as any).ReactDOM = ReactDOM;
}

createRoot(document.getElementById("root")!).render(<App />);
