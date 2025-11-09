import { useEffect, useState, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardWidgets } from "@/components/DashboardWidgets";
import { CheckSquare, FileText, Users, AlertCircle, Clock, CheckCircle2, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { useRecharts } from "@/lib/dynamic-recharts";
import { useQuery } from "@tanstack/react-query";
import { Task, ChartData } from "@/types";

const Dashboard = () => {
  // Load recharts dynamically after React is ready
  const { recharts, loading: chartsLoading, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } = useRecharts();

  // Add data-tour attribute for onboarding

  // Fetch tasks data
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("status, priority");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch documents data
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["dashboard-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("is_approved");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch members data
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["dashboard-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Fetch recent tasks
  const { data: recentTasksData, isLoading: recentLoading } = useQuery({
    queryKey: ["dashboard-recent-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, profiles!tasks_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Calculate stats and charts with useMemo for performance
  const stats = useMemo(() => {
    if (!tasks || !documents || !members) {
      return { totalTasks: 0, completedTasks: 0, pendingDocs: 0, teamMembers: 0 };
    }
    const completedCount = tasks.filter(t => t.status === "completed").length;
    return {
      totalTasks: tasks.length,
      completedTasks: completedCount,
      pendingDocs: documents.filter(d => !d.is_approved).length,
      teamMembers: members.length,
    };
  }, [tasks, documents, members]);

  const tasksByStatus = useMemo(() => {
    if (!tasks) return [];
    const statusCounts: Record<string, number> = {};
    tasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ 
      name: name.replace("_", " "), 
      value 
    }));
  }, [tasks]);

  const tasksByPriority = useMemo(() => {
    if (!tasks) return [];
    const priorityCounts: Record<string, number> = {};
    tasks.forEach(task => {
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
    });
    return Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const recentTasks = useMemo(() => {
    return (recentTasksData as Task[]) || [];
  }, [recentTasksData]);

  const isLoading = tasksLoading || docsLoading || membersLoading || recentLoading;

  const completionRate = useMemo(() => {
    return stats.totalTasks > 0 
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
      : 0;
  }, [stats]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success";
      case "in_progress":
        return "bg-warning/10 text-warning";
      case "blocked":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "medium":
        return "bg-accent text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div data-tour="dashboard" className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardWidgets />
        
        {/* Legacy Dashboard Content (can be removed if using widgets only) */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Overview</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Welcome back! Here's an overview of your team's progress.
            </p>
          </div>

          {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card hover:shadow-hover transition-shadow mobile-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedTasks} completed
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-hover transition-shadow mobile-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium">Completion Rate</CardTitle>
              <Progress value={completionRate} className="w-12 sm:w-16 h-2" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Task completion progress
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-hover transition-shadow mobile-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.pendingDocs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-hover transition-shadow mobile-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active members
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tasks */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest task updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No tasks yet. Create your first task to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <h4 className="font-medium">{task.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.profiles && (
                          <span className="text-xs text-muted-foreground">
                            Assigned to: {task.profiles.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        {stats.totalTasks > 0 && !chartsLoading && BarChart && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Tasks by Status</CardTitle>
                <CardDescription className="text-sm">Distribution of task statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mobile-scroll">
                  {ResponsiveContainer && (
                    <ResponsiveContainer width="100%" height={250} className="min-w-[300px]">
                      {BarChart && (
                        <BarChart data={tasksByStatus}>
                          {CartesianGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
                          {XAxis && <XAxis dataKey="name" className="text-xs" />}
                          {YAxis && <YAxis />}
                          {Tooltip && (
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                          )}
                          {Bar && <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Tasks by Priority</CardTitle>
                <CardDescription className="text-sm">Priority distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mobile-scroll">
                  {ResponsiveContainer && (
                    <ResponsiveContainer width="100%" height={250} className="min-w-[300px]">
                      {PieChart && (
                        <PieChart>
                          {Pie && (
                            <Pie
                              data={tasksByPriority}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="hsl(var(--primary))"
                              dataKey="value"
                            >
                              {tasksByPriority.map((entry, index) => (
                                Cell && <Cell 
                                  key={`cell-${index}`} 
                                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                                />
                              ))}
                            </Pie>
                          )}
                          {Tooltip && (
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                          )}
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
