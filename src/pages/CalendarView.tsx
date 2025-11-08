import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Clock, Target, FileText, Users, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { CalendarSyncSettings } from "@/components/CalendarSyncSettings";
import { useCalendarConnection } from "@/hooks/useCalendarConnection";
import { useSyncCalendarToGoogle, convertEventsToSyncFormat } from "@/hooks/useCalendarSync";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useDocuments } from "@/hooks/useDocuments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'milestone' | 'meeting' | 'deadline';
  entityId: string;
  status?: string;
  priority?: string;
};

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: connection } = useCalendarConnection();
  const syncToGoogleMutation = useSyncCalendarToGoogle();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const { data: documents } = useDocuments();

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected === "true") {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar has been successfully connected!",
      });
      // Remove query param
      navigate("/calendar", { replace: true });
    }
  }, [searchParams, toast, navigate]);

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
      fetchEvents();
    }
  }, [user, currentDate]);

  const fetchEvents = async () => {
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const allEvents: CalendarEvent[] = [];

      // Fetch tasks with due dates
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .not("due_date", "is", null)
        .gte("due_date", monthStart.toISOString())
        .lte("due_date", monthEnd.toISOString());

      tasks?.forEach((task) => {
        allEvents.push({
          id: task.id,
          title: task.title,
          date: new Date(task.due_date),
          type: 'task',
          entityId: task.id,
          status: task.status,
          priority: task.priority,
        });
      });

      // Fetch milestones
      const { data: milestones } = await supabase
        .from("milestones")
        .select("*")
        .gte("due_date", monthStart.toISOString().split('T')[0])
        .lte("due_date", monthEnd.toISOString().split('T')[0]);

      milestones?.forEach((milestone) => {
        allEvents.push({
          id: milestone.id,
          title: milestone.title,
          date: new Date(milestone.due_date),
          type: 'milestone',
          entityId: milestone.id,
          status: milestone.is_completed ? 'completed' : 'pending',
        });
      });

      // Fetch meetings
      const { data: meetings } = await supabase
        .from("meetings")
        .select("*")
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", monthEnd.toISOString());

      meetings?.forEach((meeting) => {
        allEvents.push({
          id: meeting.id,
          title: meeting.title,
          date: new Date(meeting.start_time),
          type: 'meeting',
          entityId: meeting.id,
        });
      });

      // Fetch document deadlines
      const { data: documents } = await supabase
        .from("documents")
        .select("*")
        .not("submission_deadline", "is", null)
        .gte("submission_deadline", monthStart.toISOString())
        .lte("submission_deadline", monthEnd.toISOString());

      documents?.forEach((doc) => {
        allEvents.push({
          id: doc.id,
          title: doc.title,
          date: new Date(doc.submission_deadline),
          type: 'deadline',
          entityId: doc.id,
          status: doc.is_approved ? 'approved' : 'pending',
        });
      });

      setEvents(allEvents);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Target className="h-3 w-3" />;
      case 'milestone':
        return <Clock className="h-3 w-3" />;
      case 'meeting':
        return <Users className="h-3 w-3" />;
      case 'deadline':
        return <FileText className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.status === 'completed') return 'bg-green-500';
    if (event.priority === 'critical') return 'bg-red-500';
    if (event.priority === 'high') return 'bg-orange-500';
    if (event.type === 'meeting') return 'bg-blue-500';
    if (event.type === 'deadline') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleSyncToGoogle = async () => {
    if (!connection) {
      toast({
        variant: "destructive",
        title: "Not Connected",
        description: "Please connect your Google Calendar first",
      });
      setSyncSettingsOpen(true);
      return;
    }

    if (!tasks || !projects || !documents) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to fetch events. Please try again.",
      });
      return;
    }

    // Get milestones from projects
    const allMilestones: any[] = [];
    for (const project of projects) {
      const { data: milestones } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", project.id);
      if (milestones) {
        allMilestones.push(...milestones);
      }
    }

    const syncEvents = convertEventsToSyncFormat(tasks, allMilestones, documents);
    syncToGoogleMutation.mutate(syncEvents);
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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendar View</h1>
            <p className="text-muted-foreground">
              View all tasks, milestones, meetings, and deadlines
            </p>
          </div>
          <div className="flex gap-2">
            {connection && (
              <Button
                onClick={handleSyncToGoogle}
                variant="outline"
                disabled={syncToGoogleMutation.isPending}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {syncToGoogleMutation.isPending ? "Syncing..." : "Sync to Google"}
              </Button>
            )}
            <Dialog open={syncSettingsOpen} onOpenChange={setSyncSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Calendar Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Google Calendar Sync Settings</DialogTitle>
                  <DialogDescription>
                    Manage your Google Calendar connection and sync preferences
                  </DialogDescription>
                </DialogHeader>
                <CalendarSyncSettings />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Empty days before month starts */}
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="p-2 min-h-[80px] border border-transparent" />
              ))}

              {/* Days of the month */}
              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 min-h-[80px] border rounded cursor-pointer hover:bg-muted transition-colors ${
                      isToday ? 'bg-accent/50 border-primary' : ''
                    } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded ${getEventColor(event)} text-white truncate flex items-center gap-1`}
                          title={event.title}
                        >
                          {getEventIcon(event.type)}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span className="text-sm">Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Meeting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Deadline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Critical</span>
              </div>
            </div>

            {/* Selected date events */}
            {selectedDate && (
              <div className="mt-6 p-4 border rounded-lg">
                <h3 className="font-semibold mb-3">
                  Events on {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events on this day</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).map((event) => (
                      <div key={event.id} className="flex items-center gap-3 p-2 border rounded">
                        {getEventIcon(event.type)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {event.type} {event.priority && `• ${event.priority} priority`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.status || 'pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CalendarView;

