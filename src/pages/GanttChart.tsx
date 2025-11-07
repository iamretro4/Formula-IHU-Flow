import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Target, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

type Project = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  competition_date: string | null;
  status: string;
};

type Task = {
  id: string;
  title: string;
  project_id: string;
  due_date: string | null;
  status: string;
  priority: string;
  projects: {
    id: string;
    name: string;
  } | null;
};

type Milestone = {
  id: string;
  title: string;
  project_id: string;
  due_date: string;
  is_completed: boolean;
  projects: {
    id: string;
    name: string;
  } | null;
};

type GanttItem = {
  id: string;
  name: string;
  type: 'project' | 'task' | 'milestone';
  start: Date;
  end: Date;
  projectId: string;
  projectName: string;
  status: string;
  priority?: string;
  isCompleted?: boolean;
};

const GanttChart = () => {
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("start_date", { ascending: true });

      if (projectsError) throw projectsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*, projects(id, name)")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from("milestones")
        .select("*, projects(id, name)")
        .order("due_date", { ascending: true });

      if (milestonesError) throw milestonesError;

      // Combine all items
      const ganttItems: GanttItem[] = [];

      // Add projects
      (projectsData || []).forEach((project) => {
        ganttItems.push({
          id: project.id,
          name: project.name,
          type: 'project',
          start: new Date(project.start_date),
          end: new Date(project.end_date),
          projectId: project.id,
          projectName: project.name,
          status: project.status,
        });
      });

      // Add tasks
      (tasksData || []).forEach((task) => {
        if (task.due_date) {
          // Estimate task duration (7 days default, or until project end)
          const startDate = new Date(task.due_date);
          startDate.setDate(startDate.getDate() - 7); // 7 days before due date
          const endDate = new Date(task.due_date);

          ganttItems.push({
            id: task.id,
            name: task.title,
            type: 'task',
            start: startDate,
            end: endDate,
            projectId: task.project_id,
            projectName: task.projects?.name || 'Unknown',
            status: task.status,
            priority: task.priority,
          });
        }
      });

      // Add milestones
      (milestonesData || []).forEach((milestone) => {
        const milestoneDate = new Date(milestone.due_date);
        ganttItems.push({
          id: milestone.id,
          name: milestone.title,
          type: 'milestone',
          start: milestoneDate,
          end: milestoneDate,
          projectId: milestone.project_id,
          projectName: milestone.projects?.name || 'Unknown',
          status: milestone.is_completed ? 'completed' : 'pending',
          isCompleted: milestone.is_completed,
        });
      });

      setItems(ganttItems);

      // Calculate date range
      if (ganttItems.length > 0) {
        const dates = ganttItems.flatMap(item => [item.start, item.end]);
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        // Add some padding
        minDate.setMonth(minDate.getMonth() - 1);
        maxDate.setMonth(maxDate.getMonth() + 1);
        setDateRange({ start: minDate, end: maxDate });
      } else {
        // Set default range if no items
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
        setDateRange({ start, end });
      }
    } catch (error: any) {
      console.error("Error fetching Gantt data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load Gantt chart data",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'milestone') {
      return status === 'completed' ? 'bg-green-500' : 'bg-yellow-500';
    }

    const colors: Record<string, string> = {
      completed: 'bg-green-500',
      in_progress: 'bg-blue-500',
      pending: 'bg-gray-400',
      blocked: 'bg-red-500',
      review: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return '';
    const colors: Record<string, string> = {
      critical: 'border-red-500 border-2',
      high: 'border-orange-500 border-2',
      medium: 'border-yellow-500',
      low: 'border-gray-300',
    };
    return colors[priority] || '';
  };

  const calculatePosition = (date: Date, rangeStart: Date, rangeEnd: Date, width: number) => {
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysFromStart = (date.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    return (daysFromStart / totalDays) * width;
  };

  const calculateWidth = (start: Date, end: Date, rangeStart: Date, rangeEnd: Date, width: number) => {
    const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    const itemDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max((itemDays / totalDays) * width, 4); // Minimum 4px width
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dateRange) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Loading Gantt chart...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No data available</p>
              <p className="text-sm text-muted-foreground">
                Create projects, tasks, and milestones to see them on the Gantt chart
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const chartWidth = 1200;
  const rowHeight = 40;
  const headerHeight = 60;

  // Group items by project
  const itemsByProject = items.reduce((acc, item) => {
    if (!acc[item.projectId]) {
      acc[item.projectId] = [];
    }
    acc[item.projectId].push(item);
    return acc;
  }, {} as Record<string, GanttItem[]>);

  // Generate date headers - monthly instead of weekly to avoid overlap
  const dateHeaders: Date[] = [];
  const currentDate = new Date(dateRange.start);
  currentDate.setDate(1); // Start of month
  while (currentDate <= dateRange.end) {
    dateHeaders.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1); // Monthly headers
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gantt Chart - All Projects</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Combined timeline view of all projects, tasks, and milestones
          </p>
        </div>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg sm:text-xl">Project Timeline</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="mobile-scroll">
              <ScrollArea className="w-full">
                <div className="relative" style={{ width: typeof window !== 'undefined' ? Math.max(chartWidth, window.innerWidth - 32) : chartWidth, minHeight: Object.keys(itemsByProject).length * rowHeight + headerHeight }}>
                {/* Date Headers */}
                <div className="sticky top-0 bg-background z-10 border-b" style={{ height: headerHeight }}>
                  <div className="flex" style={{ marginLeft: '120px' }}>
                    {dateHeaders.map((date, idx) => {
                      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                      const monthWidth = calculatePosition(monthEnd, dateRange.start, dateRange.end, chartWidth) - 
                                        calculatePosition(monthStart, dateRange.start, dateRange.end, chartWidth);
                      return (
                        <div
                          key={idx}
                          className="border-l text-xs text-center p-2 flex-shrink-0"
                          style={{ 
                            width: `${Math.max(monthWidth, 100)}px`,
                            minWidth: '100px'
                          }}
                        >
                          <div className="font-medium">{format(date, 'MMM yyyy')}</div>
                          <div className="text-xs text-muted-foreground">{format(date, 'd')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gantt Items */}
                {Object.entries(itemsByProject).map(([projectId, projectItems], projectIdx) => {
                  const projectName = projectItems[0]?.projectName || 'Unknown';
                  return (
                    <div key={projectId} className="relative border-b" style={{ height: rowHeight * projectItems.length }}>
                      {projectItems.map((item, itemIdx) => {
                        const left = calculatePosition(item.start, dateRange.start, dateRange.end, chartWidth);
                        const width = calculateWidth(item.start, item.end, dateRange.start, dateRange.end, chartWidth);
                        const top = itemIdx * rowHeight;

                        return (
                          <div key={item.id} className="absolute" style={{ top: `${top}px`, left: `${left + 120}px`, width: `${width}px`, height: `${rowHeight - 4}px` }}>
                            <div
                              className={`h-full rounded ${getStatusColor(item.status, item.type)} ${getPriorityColor(item.priority)} flex items-center px-2 text-white text-xs cursor-pointer hover:opacity-80 transition-opacity`}
                              title={`${item.name} (${formatDate(item.start)} - ${formatDate(item.end)})`}
                            >
                              <span className="truncate">{item.name}</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Project Label */}
                      <div className="absolute left-0 top-0 h-full flex items-center px-2 sm:px-4 bg-muted/50 border-r font-medium text-xs sm:text-sm" style={{ width: '120px', minWidth: '120px' }}>
                        <span className="truncate">{projectName}</span>
                      </div>
                    </div>
                  );
                })}
                </div>
              </ScrollArea>
            </div>

            {/* Legend */}
            <div className="mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Review / Milestone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Blocked</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GanttChart;

