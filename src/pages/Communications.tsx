import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Bell,
  Calendar,
  Users,
  Plus,
  Video,
  MapPin,
  Clock,
  Search,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ChannelDialog from "@/components/ChannelDialog";
import MeetingDialog from "@/components/MeetingDialog";
import NotificationDialog from "@/components/NotificationDialog";
import ErrorBoundary from "@/components/ErrorBoundary";

type Channel = {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  is_private: boolean;
  created_at: string;
  member_count?: number;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
  } | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  video_conference_url: string | null;
  meeting_type: string;
  organizer_id: string;
  organizer?: {
    id: string;
    full_name: string;
  } | null;
};

const Communications = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("channels");
  const [newMessage, setNewMessage] = useState("");
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
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
  }, [user, activeTab, selectedChannel]);

  const fetchData = async () => {
    try {
      if (activeTab === "channels") {
        const { data: channelsData, error: channelsError } = await supabase
          .from("communication_channels")
          .select("*")
          .order("created_at", { ascending: false });

        if (channelsError) throw channelsError;

        // Get member counts
        const channelsWithCounts = await Promise.all(
          (channelsData || []).map(async (channel) => {
            const { count } = await supabase
              .from("channel_members")
              .select("*", { count: "exact", head: true })
              .eq("channel_id", channel.id);
            return { ...channel, member_count: count || 0 };
          })
        );

        setChannels(channelsWithCounts);

        // Fetch messages if channel is selected
        if (selectedChannel) {
          const { data: messagesData, error: messagesError } = await supabase
            .from("messages")
            .select("*")
            .eq("channel_id", selectedChannel)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;

          // Fetch sender profiles
          const messagesWithSenders = await Promise.all(
            (messagesData || []).map(async (msg: any) => {
              const { data: sender } = await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("id", msg.sender_id)
                .single();
              return { ...msg, sender };
            })
          );

          setMessages(messagesWithSenders);
        }
      } else if (activeTab === "notifications") {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setNotifications(data || []);
      } else if (activeTab === "meetings") {
        const { data: meetingsData, error: meetingsError } = await supabase
          .from("meetings")
          .select("*")
          .order("start_time", { ascending: true });

        if (meetingsError) throw meetingsError;

        // Fetch organizer profiles
        const meetingsWithOrganizers = await Promise.all(
          (meetingsData || []).map(async (meeting: any) => {
            const { data: organizer } = await supabase
              .from("profiles")
              .select("id, full_name")
              .eq("id", meeting.organizer_id)
              .single();
            return { ...meeting, organizer };
          })
        );

        setMeetings(meetingsWithOrganizers);
      }
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

  const handleSendMessage = async () => {
    if (!selectedChannel || !newMessage.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        channel_id: selectedChannel,
        sender_id: user.id,
        content: newMessage,
      });

      if (error) throw error;

      setNewMessage("");
      await fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "deadline_alert":
        return <Clock className="h-4 w-4" />;
      case "task_assigned":
        return <MessageSquare className="h-4 w-4" />;
      case "document_approval":
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getDepartmentLabel = (dept: string | null) => {
    if (!dept) return "General";
    const labels: Record<string, string> = {
      electrical: "Electrical",
      mechanical: "Mechanical",
      operations: "Operations",
    };
    return labels[dept] || dept;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Communication & Collaboration</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Team channels, notifications, and meetings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="channels" className="text-xs sm:text-sm">Channels</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <Badge className="ml-2 text-xs">
                  {notifications.filter((n) => !n.is_read).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="text-xs sm:text-sm">Meetings</TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Channels</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Department-specific channels</CardDescription>
                      </div>
                      <Button
                        size="sm"
                        className="touch-target"
                        onClick={() => setChannelDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">New</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {loading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : channels.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No channels yet</p>
                    ) : (
                      channels.map((channel) => (
                        <div
                          key={channel.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                            selectedChannel === channel.id ? "bg-muted" : ""
                          }`}
                          onClick={() => setSelectedChannel(channel.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{channel.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getDepartmentLabel(channel.department)}
                              </p>
                            </div>
                            <Badge variant="outline">{channel.member_count || 0}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                {selectedChannel ? (
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base sm:text-lg">
                        {channels.find((c) => c.id === selectedChannel)?.name || "Channel"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      <div className="space-y-4 h-[300px] sm:h-[400px] overflow-y-auto">
                        {messages.map((message) => (
                          <div key={message.id} className="flex gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {message.sender?.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {message.sender?.full_name || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <p className="text-sm mt-1">{message.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="min-h-[44px] text-sm"
                        />
                        <Button onClick={handleSendMessage} className="touch-target">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Select a channel</p>
                      <p className="text-sm text-muted-foreground">
                        Choose a channel from the list to start messaging
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setNotificationDialogOpen(true)} className="touch-target w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Notification
              </Button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No notifications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={notification.is_read ? "opacity-60" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.is_read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkNotificationRead(notification.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meetings" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setMeetingDialogOpen(true)} className="touch-target w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Meeting
              </Button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : meetings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No meetings scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{meeting.title}</CardTitle>
                          <CardDescription>
                            Organized by {meeting.organizer?.full_name || "Unknown"}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{meeting.meeting_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(meeting.start_time).toLocaleString()} -{" "}
                          {new Date(meeting.end_time).toLocaleString()}
                        </span>
                      </div>
                      {meeting.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{meeting.location}</span>
                        </div>
                      )}
                      {meeting.video_conference_url && (
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={meeting.video_conference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join Video Call
                            </a>
                          </Button>
                        </div>
                      )}
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {meeting.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ErrorBoundary>
          <ChannelDialog
            open={channelDialogOpen}
            onOpenChange={(open) => {
              setChannelDialogOpen(open);
              if (!open) {
                setSelectedChannel(null);
                setMessages([]);
              }
            }}
            onSuccess={async () => {
              await fetchData();
              setChannelDialogOpen(false);
            }}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <MeetingDialog
            open={meetingDialogOpen}
            onOpenChange={setMeetingDialogOpen}
            onSuccess={fetchData}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <NotificationDialog
            open={notificationDialogOpen}
            onOpenChange={setNotificationDialogOpen}
            onSuccess={fetchData}
          />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default Communications;

