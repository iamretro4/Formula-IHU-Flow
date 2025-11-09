import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { TaskDialog } from "./TaskDialog";

type KanbanColumn = {
  id: string;
  title: string;
  status: Task["status"];
  tasks: Task[];
};

type KanbanBoardProps = {
  projectId?: string;
  onTaskUpdate?: () => void;
};

export function KanbanBoard({ projectId, onTaskUpdate }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: "pending", title: "Pending", status: "pending", tasks: [] },
    { id: "in_progress", title: "In Progress", status: "in_progress", tasks: [] },
    { id: "review", title: "Review", status: "completed", tasks: [] },
    { id: "completed", title: "Completed", status: "completed", tasks: [] },
    { id: "blocked", title: "Blocked", status: "blocked", tasks: [] },
  ]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from("tasks")
        .select("*, projects(id, name)")
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tasksData = (data || []) as Task[];
      setTasks(tasksData);
      tasksRef.current = tasksData;
      updateColumns(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateColumns = useCallback((taskList: Task[]) => {
    setColumns((prev) =>
      prev.map((col) => {
        // Both review and completed columns show completed tasks
        if (col.id === "review" || col.id === "completed") {
          return {
            ...col,
            tasks: taskList.filter((task) => task.status === "completed"),
          };
        }
        // Other columns match by status
        return {
          ...col,
          tasks: taskList.filter((task) => task.status === col.status),
        };
      })
    );
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const columnId = over.id as string;

    // Map column ID to task status
    const columnStatusMap: Record<string, Task["status"]> = {
      "pending": "pending",
      "in_progress": "in_progress",
      "review": "completed",
      "completed": "completed",
      "blocked": "blocked",
    };

    const newStatus = columnStatusMap[columnId];
    if (!newStatus) {
      setActiveId(null);
      return;
    }

    // Find current task
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Store previous state before optimistic update
    const previousTasks = [...tasks];
    tasksRef.current = previousTasks;

    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setTasks(updatedTasks);
    tasksRef.current = updatedTasks;
    updateColumns(updatedTasks);

    // Update in database
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      onTaskUpdate?.();
    } catch (error) {
      // Revert on error - use ref to get the latest tasks before the optimistic update
      const previousTasks = tasksRef.current;
      setTasks(previousTasks);
      updateColumns(previousTasks);
      console.error("Error updating task:", error);
    }

    setActiveId(null);
  }, [tasks, onTaskUpdate]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  }, []);

  const activeTask = useMemo(() => {
    return tasks.find((t) => t.id === activeId);
  }, [tasks, activeId]);

  if (loading) {
    return <div className="text-center p-8">Loading board...</div>;
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 mobile-smooth-scroll -mx-4 sm:mx-0 px-4 sm:px-0 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
        {/* Scroll indicator */}
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none hidden sm:block" />
      </div>
      <DragOverlay>
        {activeTask ? (
          <Card className="w-64 p-2 shadow-lg">
            <p className="text-sm font-medium">
              {activeTask.title}
            </p>
          </Card>
        ) : null}
      </DragOverlay>
      {taskDialogOpen && selectedTask && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
          projectId={selectedTask.project_id}
          onSuccess={() => {
            fetchTasks();
            setTaskDialogOpen(false);
          }}
        />
      )}
    </DndContext>
  );
}

const KanbanColumn = memo(function KanbanColumn({
  column,
  onTaskClick,
}: {
  column: KanbanColumn;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const taskIds = useMemo(() => column.tasks.map((t) => t.id), [column.tasks]);

  return (
    <div className="flex-shrink-0 w-64 sm:w-72 snap-start min-w-[256px] sm:min-w-[288px]">
      <Card ref={setNodeRef} className={isOver ? "ring-2 ring-primary" : "h-full"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>{column.title}</span>
            <Badge variant="secondary">{column.tasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 min-h-[300px] sm:min-h-[400px] max-h-[600px] overflow-y-auto scrollbar-thin">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {column.tasks.map((task) => (
              <KanbanTask key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
});

const KanbanTask = memo(function KanbanTask({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }), [transform, transition, isDragging]);

  const formattedDate = useMemo(() => {
    return task.due_date ? new Date(task.due_date).toLocaleDateString() : null;
  }, [task.due_date]);

  const handleClick = useCallback(() => {
    onClick(task);
  }, [onClick, task]);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:shadow-md transition-shadow mobile-card touch-feedback"
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 touch-target"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-1">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {task.priority}
              </Badge>
              {formattedDate && (
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

