import { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";

type TaskNode = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dependencies: string[];
  dependents: string[];
};

export function TaskDependenciesGraphVisual({ projectId }: { projectId?: string }) {
  const { data: tasks, isLoading } = useTasks();
  const [taskGraph, setTaskGraph] = useState<TaskNode[]>([]);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (tasks) {
      buildGraph();
      calculateCriticalPath();
      checkWarnings();
    }
  }, [tasks, projectId]);

  useEffect(() => {
    if (taskGraph.length > 0) {
      buildVisualGraph();
    }
  }, [taskGraph, criticalPath]);

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
    const critical: string[] = [];
    const visited = new Set<string>();

    const dfs = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskGraph.find((t) => t.id === taskId);
      if (!task) return;

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
      const hasCircular = checkCircularDependency(task.id, task.dependencies, new Set());
      if (hasCircular) {
        warningsList.push(`Circular dependency detected in task: ${task.title}`);
      }

      task.dependencies.forEach((depId) => {
        const depExists = taskGraph.some((t) => t.id === depId);
        if (!depExists) {
          warningsList.push(`Task "${task.title}" references missing dependency`);
        }
      });

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

  const buildVisualGraph = () => {
    // Create nodes
    const visualNodes: Node[] = taskGraph.map((task, index) => {
      const isCritical = criticalPath.includes(task.id);
      const statusColors: Record<string, string> = {
        pending: "#94a3b8",
        in_progress: "#3b82f6",
        review: "#f59e0b",
        completed: "#10b981",
        blocked: "#ef4444",
      };

      return {
        id: task.id,
        type: "default",
        position: {
          x: (index % 4) * 250 + 50,
          y: Math.floor(index / 4) * 150 + 50,
        },
        data: {
          label: (
            <div className="px-2 py-1">
              <div className="font-medium text-sm">{task.title}</div>
              <div className="flex gap-1 mt-1">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    backgroundColor: statusColors[task.status] || "#94a3b8",
                    color: "white",
                    border: "none",
                  }}
                >
                  {task.status}
                </Badge>
                {isCritical && (
                  <Badge variant="destructive" className="text-xs">
                    Critical
                  </Badge>
                )}
              </div>
            </div>
          ),
        },
        style: {
          background: isCritical ? "#fee2e2" : "#fff",
          border: isCritical ? "2px solid #ef4444" : "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: 0,
        },
      };
    });

    // Create edges
    const visualEdges: Edge[] = [];
    taskGraph.forEach((task) => {
      task.dependencies.forEach((depId) => {
        const isCriticalEdge = criticalPath.includes(task.id) && criticalPath.includes(depId);
        visualEdges.push({
          id: `${depId}-${task.id}`,
          source: depId,
          target: task.id,
          type: "smoothstep",
          animated: isCriticalEdge,
          style: {
            stroke: isCriticalEdge ? "#ef4444" : "#94a3b8",
            strokeWidth: isCriticalEdge ? 3 : 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCriticalEdge ? "#ef4444" : "#94a3b8",
          },
        });
      });
    });

    setNodes(visualNodes);
    setEdges(visualEdges);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (isLoading) {
    return <div className="text-center p-4">Loading dependencies...</div>;
  }

  const content = (
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
          <div className="flex items-center justify-between">
            <CardTitle>Task Dependencies Graph</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {taskGraph.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks with dependencies</p>
          ) : (
            <div
              className={`bg-gray-50 rounded-lg ${isFullscreen ? "fixed inset-4 z-50" : "h-[600px]"}`}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
              >
                <Controls />
                <Background />
                <MiniMap />
              </ReactFlow>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return content;
}

