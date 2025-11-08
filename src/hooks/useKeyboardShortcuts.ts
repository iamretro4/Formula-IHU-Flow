import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey === shortcut.shiftKey : true;
        const altMatch = shortcut.altKey ? event.altKey === shortcut.altKey : true;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // Check if input/textarea is focused (don't trigger shortcuts when typing)
        const isInputFocused =
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          (event.target as HTMLElement)?.isContentEditable;

        if (
          keyMatch &&
          ctrlMatch &&
          metaMatch &&
          shiftMatch &&
          altMatch &&
          !isInputFocused
        ) {
          event.preventDefault();
          shortcut.callback();
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};

// Common keyboard shortcuts
export const COMMON_SHORTCUTS = {
  ESC: "Escape",
  ENTER: "Enter",
  DELETE: "Delete",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
};

