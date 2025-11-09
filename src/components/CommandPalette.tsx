import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CheckSquare, FileText, Target, Users, Plus, Calendar, DollarSign } from "lucide-react";

type CommandAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
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

  const actions: CommandAction[] = [
    {
      id: "new-task",
      label: "Create New Task",
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        navigate("/tasks");
        setOpen(false);
        // Trigger task dialog - would need to pass state
      },
      keywords: ["task", "new", "create"],
    },
    {
      id: "new-document",
      label: "Upload Document",
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        navigate("/documents");
        setOpen(false);
      },
      keywords: ["document", "upload", "file"],
    },
    {
      id: "new-project",
      label: "Create Project",
      icon: <Target className="h-4 w-4" />,
      action: () => {
        navigate("/projects");
        setOpen(false);
      },
      keywords: ["project", "new"],
    },
    {
      id: "dashboard",
      label: "Go to Dashboard",
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        navigate("/dashboard");
        setOpen(false);
      },
      keywords: ["dashboard", "home"],
    },
    {
      id: "tasks",
      label: "View Tasks",
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        navigate("/tasks");
        setOpen(false);
      },
      keywords: ["tasks", "view"],
    },
    {
      id: "documents",
      label: "View Documents",
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        navigate("/documents");
        setOpen(false);
      },
      keywords: ["documents", "files"],
    },
    {
      id: "projects",
      label: "View Projects",
      icon: <Target className="h-4 w-4" />,
      action: () => {
        navigate("/projects");
        setOpen(false);
      },
      keywords: ["projects"],
    },
    {
      id: "team",
      label: "View Team",
      icon: <Users className="h-4 w-4" />,
      action: () => {
        navigate("/team");
        setOpen(false);
      },
      keywords: ["team", "members"],
    },
    {
      id: "calendar",
      label: "View Calendar",
      icon: <Calendar className="h-4 w-4" />,
      action: () => {
        navigate("/calendar");
        setOpen(false);
      },
      keywords: ["calendar", "schedule"],
    },
    {
      id: "budgets",
      label: "View Budgets",
      icon: <DollarSign className="h-4 w-4" />,
      action: () => {
        navigate("/budgets");
        setOpen(false);
      },
      keywords: ["budgets", "finance"],
    },
  ];

  const [search, setSearch] = useState("");

  const filteredActions = actions.filter((action) =>
    action.keywords.some((keyword) =>
      keyword.toLowerCase().includes(search.toLowerCase())
    ) || action.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div data-tour="command-palette" />
      <DialogContent className="max-w-2xl p-0">
        <Command>
          <CommandInput placeholder="Type a command or search..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              {filteredActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => {
                    action.action();
                  }}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

