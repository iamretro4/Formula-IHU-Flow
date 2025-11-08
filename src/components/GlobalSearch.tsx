import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, CheckSquare, Target, Users, DollarSign, MessageSquare } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface SearchResult {
  id: string;
  type: "task" | "document" | "project" | "team" | "budget" | "communication";
  title: string;
  description?: string;
  path: string;
  metadata?: Record<string, any>;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts([
    {
      key: "k",
      ctrlKey: true,
      callback: () => {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      },
      description: "Open global search",
    },
    {
      key: "Escape",
      callback: () => setOpen(false),
      description: "Close search",
    },
  ]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchAll = async () => {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, description, status, priority")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);

        if (tasks) {
          tasks.forEach((task) => {
            searchResults.push({
              id: task.id,
              type: "task",
              title: task.title,
              description: task.description || undefined,
              path: "/tasks",
              metadata: { status: task.status, priority: task.priority },
            });
          });
        }

        // Search documents
        const { data: documents } = await supabase
          .from("documents")
          .select("id, title, description, document_type")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);

        if (documents) {
          documents.forEach((doc) => {
            searchResults.push({
              id: doc.id,
              type: "document",
              title: doc.title,
              description: doc.description || undefined,
              path: "/documents",
              metadata: { type: doc.document_type },
            });
          });
        }

        // Search projects
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, description, status")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);

        if (projects) {
          projects.forEach((project) => {
            searchResults.push({
              id: project.id,
              type: "project",
              title: project.name,
              description: project.description || undefined,
              path: "/projects",
              metadata: { status: project.status },
            });
          });
        }

        // Search team members
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, department")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5);

        if (profiles) {
          profiles.forEach((profile) => {
            searchResults.push({
              id: profile.id,
              type: "team",
              title: profile.full_name,
              description: profile.email,
              path: "/team",
              metadata: { department: profile.department },
            });
          });
        }
      } catch (error) {
        console.error("Search error:", error);
      }

      setResults(searchResults);
      setLoading(false);
    };

    const debounceTimer = setTimeout(searchAll, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "task":
        return CheckSquare;
      case "document":
        return FileText;
      case "project":
        return Target;
      case "team":
        return Users;
      case "budget":
        return DollarSign;
      case "communication":
        return MessageSquare;
      default:
        return Search;
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Search across tasks, documents, projects, and team members
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Type to search..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>

          {loading && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No results found
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {results.map((result, index) => {
                const Icon = getIcon(result.type);
                return (
                  <Button
                    key={`${result.type}-${result.id}`}
                    variant={selectedIndex === index ? "secondary" : "ghost"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleSelect(result)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}

          {!query && (
            <div className="text-center text-sm text-muted-foreground py-4">
              <p className="mb-2">Keyboard shortcuts:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+K</kbd>
                <span className="text-xs">to open search</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

