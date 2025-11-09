import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Shortcut = {
  keys: string[];
  description: string;
  category: string;
};

const shortcuts: Shortcut[] = [
  { keys: ["Ctrl", "K"], description: "Open command palette", category: "Navigation" },
  { keys: ["Ctrl", "/"], description: "Show keyboard shortcuts", category: "Navigation" },
  { keys: ["Esc"], description: "Close dialogs / Cancel", category: "Navigation" },
  { keys: ["Ctrl", "F"], description: "Search / Filter", category: "Navigation" },
  { keys: ["Ctrl", "N"], description: "Create new item", category: "Actions" },
  { keys: ["Ctrl", "S"], description: "Save / Submit", category: "Actions" },
  { keys: ["Ctrl", "E"], description: "Export data", category: "Actions" },
  { keys: ["Ctrl", "B"], description: "Toggle sidebar", category: "UI" },
  { keys: ["Ctrl", "D"], description: "Toggle dark mode", category: "UI" },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold mb-3">{category}</h3>
              <div className="space-y-2">
                {items.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <Badge key={keyIdx} variant="outline" className="font-mono">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

