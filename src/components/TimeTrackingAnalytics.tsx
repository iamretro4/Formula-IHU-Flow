import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, TrendingUp, Calendar, Target } from "lucide-react";

type TimeEntry = {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  task_id: string;
  user_id: string;
};

type TimeAnalytics = {
  totalHours: number;
  totalMinutes: number;
  averageSessionLength: number;
  entriesByDay: Array<{ date: string; hours: number }>;
  entriesByTask: Array<{ taskId: string; taskTitle: string; hours: number }>;
  entriesByWeek: Array<{ week: string; hours: number }>;
};

export function TimeTrackingAnalytics({ entityType, entityId }: { entityType?: string; entityId?: string }) {
  const [analytics, setAnalytics] = useState<TimeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && entityId) {
      fetchAnalytics();
    }
  }, [user, entityId]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("time_entries" as any)
        .select("*")
        .eq("user_id", user.id);

      if (entityId) {
        query = query.eq("task_id", entityId);
      }

      const { data: entries, error } = await query.order("start_time", { ascending: false });

      if (error && error.code !== "42P01") throw error;

      const timeEntries = (entries || []) as TimeEntry[];

      // Calculate analytics
      const totalMinutes = timeEntries.reduce((sum, entry) => {
        if (entry.duration_minutes) {
          return sum + entry.duration_minutes;
        }
        // Calculate from start/end if duration not set
        if (entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          return sum + Math.floor((end.getTime() - start.getTime()) / 60000);
        }
        return sum;
      }, 0);

      const totalHours = Math.floor(totalMinutes / 60);
      const averageSessionLength = timeEntries.length > 0 ? totalMinutes / timeEntries.length : 0;

      // Group by day
      const byDay: Record<string, number> = {};
      timeEntries.forEach(entry => {
        const date = new Date(entry.start_time).toISOString().split('T')[0];
        const minutes = entry.duration_minutes || (entry.end_time ? 
          Math.floor((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 60000) : 0);
        byDay[date] = (byDay[date] || 0) + minutes;
      });

      const entriesByDay = Object.entries(byDay)
        .map(([date, minutes]) => ({ date, hours: Math.round((minutes / 60) * 10) / 10 }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      // Group by task
      const byTask: Record<string, { title: string; minutes: number }> = {};
      await Promise.all(
        timeEntries.map(async (entry) => {
          if (!byTask[entry.task_id]) {
            const { data: task } = await supabase
              .from("tasks")
              .select("title")
              .eq("id", entry.task_id)
              .single();
            byTask[entry.task_id] = {
              title: task?.title || "Unknown Task",
              minutes: 0
            };
          }
          const minutes = entry.duration_minutes || (entry.end_time ? 
            Math.floor((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 60000) : 0);
          byTask[entry.task_id].minutes += minutes;
        })
      );

      const entriesByTask = Object.entries(byTask)
        .map(([taskId, data]) => ({
          taskId,
          taskTitle: data.title,
          hours: Math.round((data.minutes / 60) * 10) / 10
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      // Group by week
      const byWeek: Record<string, number> = {};
      timeEntries.forEach(entry => {
        const date = new Date(entry.start_time);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        const minutes = entry.duration_minutes || (entry.end_time ? 
          Math.floor((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 60000) : 0);
        byWeek[weekKey] = (byWeek[weekKey] || 0) + minutes;
      });

      const entriesByWeek = Object.entries(byWeek)
        .map(([week, minutes]) => ({ week, hours: Math.round((minutes / 60) * 10) / 10 }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-4); // Last 4 weeks

      setAnalytics({
        totalHours,
        totalMinutes,
        averageSessionLength: Math.round(averageSessionLength),
        entriesByDay,
        entriesByTask,
        entriesByWeek,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No time tracking data</p>
          <p className="text-sm text-muted-foreground">
            Start tracking time to see analytics here
          </p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalHours}h {analytics.totalMinutes % 60}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(analytics.averageSessionLength / 60)}h {analytics.averageSessionLength % 60}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average session length
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.entriesByTask.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active tasks tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time by Day (Last 7 Days)</CardTitle>
            <CardDescription>Daily time tracking breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.entriesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#0088FE" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time by Task (Top 5)</CardTitle>
            <CardDescription>Time distribution across tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.entriesByTask}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ taskTitle, hours }: any) => `${taskTitle.substring(0, 15)}: ${hours}h`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="hours"
                >
                  {analytics.entriesByTask.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Time by Week (Last 4 Weeks)</CardTitle>
            <CardDescription>Weekly time tracking trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.entriesByWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tickFormatter={(week: string) => new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#0088FE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

