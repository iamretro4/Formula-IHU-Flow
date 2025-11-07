import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MeetingDialog = ({ open, onOpenChange, onSuccess }: MeetingDialogProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    video_conference_url: "",
    meeting_type: "meeting",
    project_id: "",
    channel_id: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      try {
        fetchData();
        // Set default times (1 hour meeting starting now)
        const now = new Date();
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        setFormData(prev => ({
          ...prev,
          start_time: now.toISOString().slice(0, 16),
          end_time: end.toISOString().slice(0, 16),
        }));
      } catch (error) {
        console.error("Error in MeetingDialog useEffect:", error);
      }
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [projectsRes, channelsRes] = await Promise.all([
        supabase.from("projects").select("id, name"),
        supabase.from("communication_channels").select("id, name"),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (channelsRes.error) throw channelsRes.error;

      setProjects(projectsRes.data || []);
      setChannels(channelsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load data",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const meetingData: any = {
        title: formData.title,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        meeting_type: formData.meeting_type,
        organizer_id: user.id,
      };

      if (formData.description) {
        meetingData.description = formData.description;
      }
      if (formData.location) {
        meetingData.location = formData.location;
      }
      if (formData.video_conference_url) {
        meetingData.video_conference_url = formData.video_conference_url;
      }
      if (formData.project_id) {
        meetingData.project_id = formData.project_id;
      }
      if (formData.channel_id) {
        meetingData.channel_id = formData.channel_id;
      }

      const { error } = await supabase.from("meetings").insert(meetingData);

      if (error) {
        console.error("Meeting creation error:", error);
        throw error;
      }

      toast({
        title: "Meeting created successfully",
      });

      setFormData({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        video_conference_url: "",
        meeting_type: "meeting",
        project_id: "",
        channel_id: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create meeting",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
          <DialogDescription>Schedule a new meeting or event</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_type">Meeting Type *</Label>
              <Select value={formData.meeting_type} onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}>
                <SelectTrigger id="meeting_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="briefing">Briefing</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Workshop, Online"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_conference_url">Video Conference URL</Label>
            <Input
              id="video_conference_url"
              type="url"
              value={formData.video_conference_url}
              onChange={(e) => setFormData({ ...formData, video_conference_url: e.target.value })}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Select value={formData.project_id || undefined} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger id="project_id">
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel_id">Channel (Optional)</Label>
              <Select value={formData.channel_id || undefined} onValueChange={(value) => setFormData({ ...formData, channel_id: value })}>
                <SelectTrigger id="channel_id">
                  <SelectValue placeholder="Select a channel (optional)" />
                </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDialog;

