import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Plus, MessageSquare, Hash } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useDocuments } from "@/hooks/useDocuments";
import { useProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type WidgetType = "stats" | "tasks" | "documents" | "projects" | "chart" | "discord";

type Widget = {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
};

const defaultWidgets: Widget[] = [
  { id: "1", type: "discord", title: "Discord Channels", order: 1 },
];

export function DashboardWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: documents, isLoading: docsLoading } = useDocuments();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const saved = localStorage.getItem("dashboardWidgets");
    if (saved) {
      setWidgets(JSON.parse(saved));
    }
  }, []);

  const saveLayout = () => {
    localStorage.setItem("dashboardWidgets", JSON.stringify(widgets));
    setIsEditing(false);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeWidget = (id: string) => {
    setWidgets((items) => items.filter((item) => item.id !== id));
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      order: widgets.length + 1,
    };
    setWidgets([...widgets, newWidget]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveLayout}>Save Layout</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Customize
            </Button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                isEditing={isEditing}
                onRemove={removeWidget}
                tasks={tasks || []}
                documents={documents || []}
                projects={projects || []}
                tasksLoading={tasksLoading}
                docsLoading={docsLoading}
                projectsLoading={projectsLoading}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Add Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {(["stats", "tasks", "documents", "projects", "chart", "discord"] as WidgetType[]).map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  onClick={() => addWidget(type)}
                  disabled={widgets.some((w) => w.type === type)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SortableWidget({
  widget,
  isEditing,
  onRemove,
  tasks,
  documents,
  projects,
  tasksLoading,
  docsLoading,
  projectsLoading,
}: {
  widget: Widget;
  isEditing: boolean;
  onRemove: (id: string) => void;
  tasks: any[];
  documents: any[];
  projects: any[];
  tasksLoading: boolean;
  docsLoading: boolean;
  projectsLoading: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isEditing ? "relative" : ""}>
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={() => onRemove(widget.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {widget.type === "stats" && <StatsWidget tasks={tasks} documents={documents} projects={projects} />}
        {widget.type === "tasks" && (
          <TasksWidget tasks={tasks} loading={tasksLoading} />
        )}
        {widget.type === "documents" && (
          <DocumentsWidget documents={documents} loading={docsLoading} />
        )}
        {widget.type === "projects" && (
          <ProjectsWidget projects={projects} loading={projectsLoading} />
        )}
        {widget.type === "chart" && <ChartWidget />}
        {widget.type === "discord" && <DiscordChannelsWidget />}
      </CardContent>
    </Card>
  );
}

function StatsWidget({ tasks, documents, projects }: { tasks: any[]; documents: any[]; projects: any[] }) {
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Tasks</span>
          <Badge>{totalTasks}</Badge>
        </div>
        <Progress value={completionRate} />
        <p className="text-xs text-muted-foreground mt-1">
          {completedTasks} of {totalTasks} completed
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold">{documents.length}</p>
          <p className="text-xs text-muted-foreground">Documents</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{projects.length}</p>
          <p className="text-xs text-muted-foreground">Projects</p>
        </div>
      </div>
    </div>
  );
}

function TasksWidget({ tasks, loading }: { tasks: any[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="space-y-2">
      {recentTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet</p>
      ) : (
        recentTasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <p className="text-sm font-medium">{task.title}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {task.status}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DocumentsWidget({ documents, loading }: { documents: any[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-2">
      {recentDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet</p>
      ) : (
        recentDocs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <p className="text-sm font-medium">{doc.title}</p>
              <Badge variant={doc.is_approved ? "default" : "outline"} className="text-xs mt-1">
                {doc.is_approved ? "Approved" : "Pending"}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ProjectsWidget({ projects, loading }: { projects: any[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const activeProjects = projects.filter((p) => p.status !== "completed").slice(0, 5);

  return (
    <div className="space-y-2">
      {activeProjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active projects</p>
      ) : (
        activeProjects.map((project) => (
          <div key={project.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <p className="text-sm font-medium">{project.name}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {project.status}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ChartWidget() {
  return (
    <div className="h-32 flex items-center justify-center text-muted-foreground">
      <p className="text-sm">Chart widget coming soon</p>
    </div>
  );
}

function DiscordChannelsWidget() {
  // Discord channels configuration
  // You can fetch these from Supabase or configure them here
  const channels = [
    { name: "general", icon: "💬", description: "General discussion", unread: 3 },
    { name: "announcements", icon: "📢", description: "Important updates", unread: 1 },
    { name: "roles", icon: "🎭", description: "Select your team role", unread: 0 },
    { name: "tasks", icon: "✅", description: "Task discussions", unread: 5 },
    { name: "team-a", icon: "🔴", description: "Team A channel", unread: 2 },
    { name: "team-b", icon: "🔵", description: "Team B channel", unread: 0 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Server Channels</p>
      </div>
      {channels.map((channel) => (
        <a
          key={channel.name}
          href={`https://discord.com/channels/@me`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2 border rounded hover:bg-accent transition-colors group"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{channel.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">#{channel.name}</p>
              <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
            </div>
          </div>
          {channel.unread > 0 && (
            <Badge variant="destructive" className="ml-2 flex-shrink-0">
              {channel.unread}
            </Badge>
          )}
        </a>
      ))}
      <div className="pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open("https://discord.com/channels/@me", "_blank")}
        >
          <Hash className="h-4 w-4 mr-2" />
          Open Discord
        </Button>
      </div>
    </div>
  );
}

