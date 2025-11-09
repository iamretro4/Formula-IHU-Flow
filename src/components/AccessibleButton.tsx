import { Button, ButtonProps } from "@/components/ui/button";
// CRITICAL: Use React from global scope if available (set by react-init), otherwise use module
import * as ReactModule from "react";
const React = (typeof window !== 'undefined' && (window as any).React) || ReactModule;
const forwardRef = React.forwardRef;

export const AccessibleButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        {...props}
        aria-label={props["aria-label"] || (typeof children === "string" ? children : undefined)}
        role={props.role || "button"}
        tabIndex={props.tabIndex ?? 0}
      >
        {children}
      </Button>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

