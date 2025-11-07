import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "./TaskDialog";
import { Plus, Calendar, User, GanttChart, LayoutGrid, List } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  assigned_to_profile: { id: string; full_name: string } | null;
  projects: { id: string; name: string } | null;
};

type ProjectTasksViewProps = {
  projectId: string;
  projectName: string;
  tasks: Task[];
  onTaskUpdate: () => void;
};

export function ProjectTasksView({
  projectId,
  projectName,
  tasks,
  onTaskUpdate,
}: ProjectTasksViewProps) {
  const [view, setView] = useState<"gantt" | "kanban" | "list">("kanban");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const projectTasks = tasks.filter((t) => t.project_id === projectId);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      in_progress: "bg-blue-500/20 text-blue-600",
      review: "bg-yellow-500/20 text-yellow-600",
      completed: "bg-green-500/20 text-green-600",
      blocked: "bg-red-500/20 text-red-600",
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "border-gray-300",
      medium: "border-blue-400",
      high: "border-orange-400",
      critical: "border-red-500",
    };
    return colors[priority] || colors.medium;
  };

  // Kanban columns
  const kanbanColumns = [
    { id: "pending", title: "Pending", tasks: projectTasks.filter((t) => t.status === "pending") },
    { id: "in_progress", title: "In Progress", tasks: projectTasks.filter((t) => t.status === "in_progress") },
    { id: "review", title: "Review", tasks: projectTasks.filter((t) => t.status === "review") },
    { id: "completed", title: "Completed", tasks: projectTasks.filter((t) => t.status === "completed") },
    { id: "blocked", title: "Blocked", tasks: projectTasks.filter((t) => t.status === "blocked") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{projectName}</h3>
          <p className="text-sm text-muted-foreground">
            {projectTasks.length} task{projectTasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setSelectedTask(undefined);
            setTaskDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="kanban">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List
          </TabsTrigger>
          <TabsTrigger value="gantt">
            <GanttChart className="h-4 w-4 mr-2" />
            Gantt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
            {kanbanColumns.map((column) => (
              <div key={column.id} className="min-w-[250px]">
                <div className="mb-2">
                  <h4 className="font-medium text-sm">
                    {column.title} ({column.tasks.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {column.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className={`border-l-4 ${getPriorityColor(task.priority)} cursor-pointer hover:shadow-md transition-shadow`}
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDialogOpen(true);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{task.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {task.due_date && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                        {task.assigned_to_profile && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <User className="h-3 w-3 mr-1" />
                            {task.assigned_to_profile.full_name}
                          </div>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                          {task.difficulty && (
                            <Badge variant="outline" className="text-xs">
                              {task.difficulty}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {column.tasks.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-2">
            {projectTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No tasks in this project</p>
                </CardContent>
              </Card>
            ) : (
              projectTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`border-l-4 ${getPriorityColor(task.priority)} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => {
                    setSelectedTask(task);
                    setTaskDialogOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {task.due_date && (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                          {task.profiles && (
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {task.profiles.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline">{task.priority}</Badge>
                        {task.difficulty && (
                          <Badge variant="outline">{task.difficulty}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gantt Chart View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No tasks to display
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projectTasks.map((task) => {
                      const startDate = task.created_at
                        ? new Date(task.created_at)
                        : new Date();
                      const endDate = task.due_date
                        ? new Date(task.due_date)
                        : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                      const daysDiff = Math.ceil(
                        (endDate.getTime() - startDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      const width = Math.max(daysDiff * 20, 100);

                      return (
                        <div key={task.id} className="flex items-center gap-4">
                          <div className="w-48 text-sm truncate">{task.title}</div>
                          <div className="flex-1 relative h-8 bg-muted rounded">
                            <div
                              className={`h-full rounded ${getStatusColor(task.status)} flex items-center px-2 text-xs`}
                              style={{ width: `${width}px`, minWidth: "100px" }}
                            >
                              {task.due_date
                                ? new Date(task.due_date).toLocaleDateString()
                                : "No due date"}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        projectId={projectId}
        onSuccess={() => {
          onTaskUpdate();
          setTaskDialogOpen(false);
        }}
      />
    </div>
  );
}

