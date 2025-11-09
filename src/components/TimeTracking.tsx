import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { TimeTrackingAnalytics } from "./TimeTrackingAnalytics";

type TimeEntry = {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  created_at: string;
};

type TimeTrackingProps = {
  taskId?: string;
  entityType?: "task" | "project";
  entityId?: string;
  entityTitle?: string;
};

export function TimeTracking({ taskId, entityType = "task", entityId, entityTitle }: TimeTrackingProps) {
  // Support both old (taskId) and new (entityType/entityId) interfaces
  const actualTaskId = taskId || entityId || "";
  const actualEntityType = entityType;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentStart, setCurrentStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState("");
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (actualTaskId) {
      fetchUser();
      fetchEntries();
      checkActiveTracking();
    }
  }, [actualTaskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && currentStart) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - currentStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentStart]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await (supabase
        .from("time_entries" as any)
        .select("*")
        .eq("task_id", actualTaskId)
        .order("created_at", { ascending: false }) as Promise<{ data: TimeEntry[] | null; error: any }>);

      if (error && error.code !== "42P01") throw error;
      setEntries((data || []) as TimeEntry[]);
    } catch (error: any) {
      console.error("Error fetching time entries:", error);
    }
  };

  const checkActiveTracking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase
        .from("time_entries" as any)
        .select("*")
        .eq("task_id", actualTaskId)
        .eq("user_id", user.id)
        .is("end_time", null)
        .maybeSingle() as Promise<{ data: TimeEntry | null; error: any }>);

      if (data) {
        setIsTracking(true);
        setCurrentStart(new Date(data.start_time));
      }
    } catch (error) {
      console.error("Error checking active tracking:", error);
    }
  };

  const startTracking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase
        .from("time_entries" as any)
        .insert({
          task_id: actualTaskId,
          user_id: user.id,
          start_time: new Date().toISOString(),
        }) as Promise<{ error: any }>);

      if (error) throw error;

      setIsTracking(true);
      setCurrentStart(new Date());
      setElapsed(0);
      toast({ title: "Time tracking started" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const stopTracking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: activeEntry } = await (supabase
        .from("time_entries" as any)
        .select("*")
        .eq("task_id", actualTaskId)
        .eq("user_id", user.id)
        .is("end_time", null)
        .maybeSingle() as Promise<{ data: TimeEntry | null; error: any }>);

      if (!activeEntry) return;

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - new Date(activeEntry.start_time).getTime()) / 60000);

      const { error } = await (supabase
        .from("time_entries" as any)
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: duration,
          description: description || null,
        })
        .eq("id", activeEntry.id) as Promise<{ error: any }>);

      if (error) throw error;

      setIsTracking(false);
      setCurrentStart(null);
      setElapsed(0);
      setDescription("");
      fetchEntries();
      toast({ title: "Time tracking stopped" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {!isTracking ? (
            <Button onClick={startTracking} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          ) : (
            <>
              <div className="flex-1">
                <div className="text-2xl font-mono font-bold">{formatElapsed(elapsed)}</div>
                <p className="text-xs text-muted-foreground">Currently tracking</p>
              </div>
              <Button onClick={stopTracking} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {isTracking && (
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Total Time</p>
            <p className="text-2xl font-bold">
              {totalHours}h {remainingMinutes}m
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Entries</p>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entries yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm">
                      {format(new Date(entry.start_time), "MMM d, h:mm a")}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : "In progress"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TimeTrackingWithAnalytics({ entityType, entityId, entityTitle }: TimeTrackingProps) {
  return (
    <Tabs defaultValue="tracking" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tracking">
          <Clock className="mr-2 h-4 w-4" />
          Time Tracking
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tracking" className="mt-4">
        <TimeTracking entityType={entityType} entityId={entityId} entityTitle={entityTitle} />
      </TabsContent>
      <TabsContent value="analytics" className="mt-4">
        <TimeTrackingAnalytics entityType={entityType} entityId={entityId} />
      </TabsContent>
    </Tabs>
  );
}

