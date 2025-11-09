import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { TaskDependenciesGraphVisual } from "./TaskDependenciesGraphVisual";

type TaskNode = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dependencies: string[];
  dependents: string[];
};

export function TaskDependenciesGraph({ projectId }: { projectId?: string }) {
  const { data: tasks, isLoading } = useTasks();
  const [taskGraph, setTaskGraph] = useState<TaskNode[]>([]);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (tasks) {
      buildGraph();
      calculateCriticalPath();
      checkWarnings();
    }
  }, [tasks, projectId]);

  const buildGraph = () => {
    const filteredTasks = projectId
      ? tasks?.filter((t) => t.project_id === projectId) || []
      : tasks || [];

    const graph: TaskNode[] = filteredTasks.map((task) => {
      const deps = (task.dependencies as string[]) || [];
      const dependents = filteredTasks
        .filter((t) => (t.dependencies as string[])?.includes(task.id))
        .map((t) => t.id);

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dependencies: deps,
        dependents,
      };
    });

    setTaskGraph(graph);
  };

  const calculateCriticalPath = () => {
    // Simple critical path calculation (tasks with no dependencies or blocking dependencies)
    const critical: string[] = [];
    const visited = new Set<string>();

    const dfs = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskGraph.find((t) => t.id === taskId);
      if (!task) return;

      // If task is blocked or has blocking dependencies, it's on critical path
      if (task.status === "blocked" || task.dependencies.length > 0) {
        critical.push(taskId);
      }

      task.dependents.forEach((depId) => dfs(depId));
    };

    taskGraph.forEach((task) => {
      if (task.dependencies.length === 0) {
        dfs(task.id);
      }
    });

    setCriticalPath(critical);
  };

  const checkWarnings = () => {
    const warningsList: string[] = [];

    taskGraph.forEach((task) => {
      // Check for circular dependencies
      const hasCircular = checkCircularDependency(task.id, task.dependencies, new Set());
      if (hasCircular) {
        warningsList.push(`Circular dependency detected in task: ${task.title}`);
      }

      // Check for missing dependencies
      task.dependencies.forEach((depId) => {
        const depExists = taskGraph.some((t) => t.id === depId);
        if (!depExists) {
          warningsList.push(`Task "${task.title}" references missing dependency`);
        }
      });

      // Check for blocked tasks blocking others
      if (task.status === "blocked" && task.dependents.length > 0) {
        warningsList.push(`Blocked task "${task.title}" is blocking ${task.dependents.length} other task(s)`);
      }
    });

    setWarnings(warningsList);
  };

  const checkCircularDependency = (
    taskId: string,
    dependencies: string[],
    visited: Set<string>
  ): boolean => {
    if (visited.has(taskId)) return true;
    visited.add(taskId);

    for (const depId of dependencies) {
      const depTask = taskGraph.find((t) => t.id === depId);
      if (depTask && checkCircularDependency(depId, depTask.dependencies, new Set(visited))) {
        return true;
      }
    }

    return false;
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading dependencies...</div>;
  }

  return (
    <Tabs defaultValue="visual" className="space-y-4">
      <TabsList>
        <TabsTrigger value="visual">Visual Graph</TabsTrigger>
        <TabsTrigger value="list">List View</TabsTrigger>
      </TabsList>
      
      <TabsContent value="visual">
        <TaskDependenciesGraphVisual projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="list">
        <div className="space-y-4">
          {warnings.length > 0 && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Dependency Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-warning-foreground">
                      {warning}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Task Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {taskGraph.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks with dependencies</p>
                ) : (
                  taskGraph.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 border rounded ${
                        criticalPath.includes(task.id) ? "border-destructive bg-destructive/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          {criticalPath.includes(task.id) && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                      {task.dependencies.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Depends on:</p>
                          <div className="flex flex-wrap gap-1">
                            {task.dependencies.map((depId) => {
                              const depTask = taskGraph.find((t) => t.id === depId);
                              return (
                                <Badge
                                  key={depId}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {depTask?.title || depId.substring(0, 8)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {task.dependents.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Blocks:</p>
                          <div className="flex flex-wrap gap-1">
                            {task.dependents.map((depId) => {
                              const depTask = taskGraph.find((t) => t.id === depId);
                              return (
                                <Badge
                                  key={depId}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {depTask?.title || depId.substring(0, 8)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

