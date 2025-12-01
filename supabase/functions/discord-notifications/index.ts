// Supabase Edge Function for Discord Notifications
// Sends Discord messages when tasks are created or updated

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Creates a DM channel with a user
 */
async function createDMChannel(discordUserId: string): Promise<string | null> {
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create DM channel:", error);
      return null;
    }

    const channel = await response.json();
    return channel.id;
  } catch (error) {
    console.error("Error creating DM channel:", error);
    return null;
  }
}

/**
 * Sends a message to a Discord channel (DM or server channel)
 */
async function sendDiscordMessage(
  channelId: string,
  content: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending Discord message:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { taskId, eventType, userId, channelId } = await req.json();

    if (!taskId || !eventType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: taskId, eventType" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get task details
    const { data: task, error: taskError } = await supabaseClient
      .from("tasks")
      .select(`
        id,
        content,
        title,
        status,
        priority,
        assigned_to,
        created_by,
        profiles!tasks_assigned_to_fkey(id, full_name, discord_user_id),
        profiles!tasks_created_by_fkey(id, full_name, discord_user_id)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Task not found:", taskError);
      return new Response(
        JSON.stringify({ error: "Task not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const taskContent = task.content || task.title || "Untitled Task";
    const taskStatus = task.status || "pending";
    const taskPriority = task.priority || "medium";

    // Determine who to notify
    let discordUserId: string | null = null;
    let userName: string = "User";

    if (eventType === "created" && task.profiles?.discord_user_id) {
      // Notify the creator (if different from assignee)
      discordUserId = task.profiles?.discord_user_id;
      userName = task.profiles?.full_name || "User";
    } else if (eventType === "assigned" && task.profiles?.discord_user_id) {
      // Notify the assignee
      discordUserId = task.profiles?.discord_user_id;
      userName = task.profiles?.full_name || "User";
    } else if (userId) {
      // Try to get Discord user ID from profile
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("discord_user_id, full_name")
        .eq("id", userId)
        .single();

      if (profile?.discord_user_id) {
        discordUserId = profile.discord_user_id;
        userName = profile.full_name || "User";
      }
    }

    if (!discordUserId) {
      // No Discord user to notify
      return new Response(
        JSON.stringify({ message: "No Discord user to notify" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build notification message
    let message = "";
    const statusEmoji = taskStatus === "completed" ? "✅" : taskStatus === "in_progress" ? "🔄" : "⏳";
    const priorityEmoji = taskPriority === "critical" ? "🔴" : taskPriority === "high" ? "🟠" : taskPriority === "medium" ? "🟡" : "🟢";

    switch (eventType) {
      case "created":
        message = `📋 **New Task Created**\n${statusEmoji} ${priorityEmoji} **${taskContent}**\nStatus: ${taskStatus}\nPriority: ${taskPriority}`;
        break;
      case "updated":
        message = `📝 **Task Updated**\n${statusEmoji} ${priorityEmoji} **${taskContent}**\nNew Status: ${taskStatus}`;
        break;
      case "assigned":
        message = `👤 **Task Assigned to You**\n${statusEmoji} ${priorityEmoji} **${taskContent}**\nStatus: ${taskStatus}\nPriority: ${taskPriority}`;
        break;
      case "completed":
        message = `✅ **Task Completed!**\n**${taskContent}**\nGreat work! 🎉`;
        break;
      default:
        message = `📋 **Task Update**\n${statusEmoji} ${priorityEmoji} **${taskContent}**\nStatus: ${taskStatus}`;
    }

    // Send notification
    let targetChannelId = channelId;

    // If no channel ID provided, create a DM
    if (!targetChannelId) {
      targetChannelId = await createDMChannel(discordUserId);
      if (!targetChannelId) {
        console.error("Failed to create DM channel for user:", discordUserId);
        return new Response(
          JSON.stringify({ error: "Failed to create DM channel" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const sent = await sendDiscordMessage(targetChannelId, message);

    if (!sent) {
      return new Response(
        JSON.stringify({ error: "Failed to send Discord message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Discord notification sent",
        channelId: targetChannelId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing Discord notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

