// This module ensures React is available globally before any other code runs
// Import this FIRST in main.tsx to guarantee React is initialized before vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";

// CRITICAL: Replace the stub with the real React.Children
// This runs synchronously after the HTML script creates the stub
if (typeof window !== "undefined") {
  // Set React immediately
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // Replace the stub with the real React.Children
  if (React && React.Children) {
    const reactObj = (window as any).React;
    
    // Use the setter (created by HTML script) to replace the stub
    try {
      reactObj.Children = React.Children;
    } catch (e) {
      // If setter fails, set directly
      reactObj.__realChildren = React.Children;
      reactObj.Children = React.Children;
    }
  
    // Also cache it for direct access
    (window as any).__REACT_CHILDREN__ = React.Children;
  
    // Force ensure it's accessible
    if (!reactObj.Children) {
      reactObj.Children = React.Children;
    }
  
    // Make sure all methods are accessible
    if (React.Children.map) {
      reactObj.Children.map = React.Children.map;
    }
    if (React.Children.forEach) {
      reactObj.Children.forEach = React.Children.forEach;
    }
    if (React.Children.count) {
      reactObj.Children.count = React.Children.count;
    }
    if (React.Children.only) {
      reactObj.Children.only = React.Children.only;
    }
    if (React.Children.toArray) {
      reactObj.Children.toArray = React.Children.toArray;
    }
  }
}

// Export React so other modules can use it
export { React, ReactDOM };
export * from "react";
export * from "react-dom";

