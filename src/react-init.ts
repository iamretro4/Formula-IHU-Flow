// This module ensures React is available globally AND initialized
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
  
  // CRITICAL: Initialize React's dispatcher by creating a temporary root
  // This ensures React's internal state is ready before any hooks are called
  try {
    const tempContainer = document.createElement('div');
    tempContainer.style.display = 'none';
    tempContainer.id = '__react_init_temp__';
    document.body.appendChild(tempContainer);
    
    const { createRoot } = ReactDOM;
    const tempRoot = createRoot(tempContainer);
    
    // Render a minimal component to initialize React's dispatcher
    tempRoot.render(React.createElement('div', null));
    
    // Immediately unmount and remove - we just needed to initialize React
    setTimeout(() => {
      tempRoot.unmount();
      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }, 0);
  } catch (e) {
    // If initialization fails, continue anyway
    console.warn('React dispatcher initialization failed:', e);
  }
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";


