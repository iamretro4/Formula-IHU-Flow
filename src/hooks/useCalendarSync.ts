import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleError, handleSuccess } from "@/utils/errorHandler";
import { Task, Milestone, Document } from "@/types";

interface SyncEvent {
  id: string;
  title: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  type: "task" | "milestone" | "meeting" | "deadline";
  entity_type: "task" | "milestone" | "document";
  entity_id: string;
  google_event_id?: string;
}

export const useSyncCalendarToGoogle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (events: SyncEvent[]) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action: "sync_to_google",
          events,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connection"] });
      handleSuccess(
        `Synced ${data.syncedCount || 0} events to Google Calendar`,
        "Calendar sync complete"
      );
    },
    onError: (error) => handleError(error, "Sync to Google Calendar"),
  });
};

export const useSyncCalendarFromGoogle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action: "sync_from_google",
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connection"] });
      handleSuccess(
        `Synced ${data.events?.length || 0} events from Google Calendar`,
        "Calendar sync complete"
      );
    },
    onError: (error) => handleError(error, "Sync from Google Calendar"),
  });
};

// Helper function to convert app events to sync events
export const convertEventsToSyncFormat = (
  tasks: Task[],
  milestones: Milestone[],
  documents: Document[]
): SyncEvent[] => {
  const events: SyncEvent[] = [];

  // Convert tasks
  tasks.forEach((task) => {
    if (task.due_date) {
      events.push({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        start_time: new Date(task.due_date).toISOString(),
        end_time: new Date(new Date(task.due_date).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        type: "task",
        entity_type: "task",
        entity_id: task.id,
        google_event_id: (task as any).metadata?.google_event_id,
      });
    }
  });

  // Convert milestones
  milestones.forEach((milestone) => {
    events.push({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description || undefined,
      start_time: new Date(milestone.due_date).toISOString(),
      end_time: new Date(new Date(milestone.due_date).getTime() + 60 * 60 * 1000).toISOString(),
      type: "milestone",
      entity_type: "milestone",
      entity_id: milestone.id,
      google_event_id: (milestone as any).metadata?.google_event_id,
    });
  });

  // Convert document deadlines
  documents.forEach((doc) => {
    if (doc.submission_deadline) {
      events.push({
        id: doc.id,
        title: `${doc.title} (Deadline)`,
        description: doc.description || undefined,
        start_time: new Date(doc.submission_deadline).toISOString(),
        end_time: new Date(new Date(doc.submission_deadline).getTime() + 60 * 60 * 1000).toISOString(),
        type: "deadline",
        entity_type: "document",
        entity_id: doc.id,
      });
    }
  });

  return events;
};

