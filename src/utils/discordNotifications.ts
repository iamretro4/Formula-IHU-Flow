// Utility to send Discord notifications from the app
// Call this when tasks are created/updated in your app

import { supabase } from "@/integrations/supabase/client";

export async function notifyDiscordTaskChange(
  taskId: string,
  eventType: "created" | "updated" | "assigned" | "completed",
  userId?: string
): Promise<void> {
  try {
    // Call the discord-notifications edge function
    const { error } = await supabase.functions.invoke("discord-notifications", {
      body: {
        taskId,
        eventType,
        userId,
      },
    });

    if (error) {
      console.error("Failed to send Discord notification:", error);
      // Don't throw - notifications are non-critical
    }
  } catch (error) {
    console.error("Error calling Discord notification function:", error);
    // Silently fail - notifications shouldn't break the app
  }
}

// Hook to use in components
export function useDiscordNotifications() {
  return {
    notifyTaskCreated: (taskId: string, userId?: string) =>
      notifyDiscordTaskChange(taskId, "created", userId),
    notifyTaskUpdated: (taskId: string, userId?: string) =>
      notifyDiscordTaskChange(taskId, "updated", userId),
    notifyTaskAssigned: (taskId: string, userId: string) =>
      notifyDiscordTaskChange(taskId, "assigned", userId),
    notifyTaskCompleted: (taskId: string, userId?: string) =>
      notifyDiscordTaskChange(taskId, "completed", userId),
  };
}

