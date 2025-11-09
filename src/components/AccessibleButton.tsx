import { Button, ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

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

