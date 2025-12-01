// Supabase Edge Function for Discord Welcome Messages
// Handles guild member join events and sends welcome messages with role selection

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
 * Sends a welcome message to a Discord channel
 */
async function sendWelcomeMessage(
  channelId: string,
  userId: string,
  username: string
): Promise<boolean> {
  try {
    const welcomeContent = `Hey <@${userId}>, welcome to Formula IHU 2026! 👋

To help us organise your access to the correct team channels, please follow these steps:

1️⃣ **Change your Discord nickname** in this server to your full name (Name + Surname).
   This ensures proper and clear communication inside the team.

2️⃣ **Go to the #roles channel** and select your team role using the buttons**.
   The correct channels will unlock automatically once you choose your role.

3️⃣ **Register at flow.fihu.gr** and sync your account with Discord using \`/linkaccount\`.

If you need help at any point, feel free to reach out.

Καλώς ήρθες και… ΦΙΙΙΙΧΟΥΥΥΥΥ 🏎️

🔥`;

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: welcomeContent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending welcome message:", error);
    return false;
  }
}

/**
 * Sends a role selection message to a channel
 */
async function sendRoleSelectionMessage(channelId: string): Promise<boolean> {
  try {
    // Get available roles from Supabase (you can configure these)
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Formula IHU 2026 Team Roles
    const roles = [
      { id: "role_board", label: "Board", emoji: "👑" },
      { id: "role_technical", label: "Technical", emoji: "⚙️" },
      { id: "role_electrical", label: "Electrical", emoji: "⚡" },
      { id: "role_business", label: "Business", emoji: "💼" },
      { id: "role_ses", label: "SES", emoji: "📊" },
      { id: "role_iad", label: "IAD", emoji: "🎯" },
      { id: "role_ases", label: "ASES", emoji: "🚀" },
      { id: "role_cost_event", label: "Cost Event", emoji: "💰" },
      { id: "role_design_event", label: "Design Event", emoji: "✏️" },
      { id: "role_bpp", label: "BPP", emoji: "📋" },
    ];

    // Split roles into rows (max 5 buttons per row)
    const components = [];
    for (let i = 0; i < roles.length; i += 5) {
      const rowRoles = roles.slice(i, i + 5);
      components.push({
        type: 1, // ACTION_ROW
        components: rowRoles.map((role) => ({
          type: 2, // BUTTON
          style: 1, // PRIMARY (blurple)
          label: role.label,
          emoji: { name: role.emoji },
          custom_id: role.id,
        })),
      });
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "**Select Your Team Role**\n\nClick a button below to assign yourself a team role:",
        components: components,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending role selection message:", error);
    return false;
  }
}

/**
 * Assigns a role to a user
 */
async function assignRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error assigning role:", error);
    return false;
  }
}

/**
 * Gets the welcome channel ID for a guild (defaults to system channel or first channel)
 */
async function getWelcomeChannelId(guildId: string): Promise<string | null> {
  try {
    // Try to get the system channel first
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (guildResponse.ok) {
      const guild = await guildResponse.json();
      if (guild.system_channel_id) {
        return guild.system_channel_id;
      }
    }

    // Fallback: get first text channel
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (channelsResponse.ok) {
      const channels = await channelsResponse.json();
      const textChannel = channels.find((ch: any) => ch.type === 0); // GUILD_TEXT
      if (textChannel) {
        return textChannel.id;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting welcome channel:", error);
    return null;
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
    const body = await req.json();

    // Handle guild member add event (automatic welcome)
    // This can be triggered by:
    // 1. Discord Gateway bot calling this endpoint
    // 2. Webhook from external service
    // 3. Manual trigger for testing
    if (body.type === "guild_member_add" || body.event === "member_join" || body.t === "GUILD_MEMBER_ADD") {
      const guildId = body.guild_id || body.guild?.id;
      const user = body.user || body.member?.user;
      const channelId = body.channel_id || body.channel_id;
      
      if (!guildId || !user) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: guild_id and user" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get welcome channel if not provided
      let welcomeChannelId = channelId;
      if (!welcomeChannelId) {
        welcomeChannelId = await getWelcomeChannelId(guildId);
      }

      if (!welcomeChannelId) {
        return new Response(
          JSON.stringify({ error: "Could not find a welcome channel. Please specify channel_id or set a system channel in Discord." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Send welcome message
      const success = await sendWelcomeMessage(
        welcomeChannelId,
        user.id,
        user.username || user.global_name || "there"
      );

      return new Response(
        JSON.stringify({ success, message: "Welcome message sent", channel_id: welcomeChannelId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle role selection setup (admin command)
    if (body.type === "setup_roles" || body.event === "setup_roles") {
      const { channel_id } = body;
      
      if (!channel_id) {
        return new Response(
          JSON.stringify({ error: "Missing channel_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const success = await sendRoleSelectionMessage(channel_id);

      return new Response(
        JSON.stringify({ success, message: "Role selection message sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle role assignment
    if (body.type === "assign_role" || body.event === "assign_role") {
      const { guild_id, user_id, role_id } = body;
      
      if (!guild_id || !user_id || !role_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const success = await assignRole(guild_id, user_id, role_id);

      return new Response(
        JSON.stringify({ success, message: success ? "Role assigned" : "Failed to assign role" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown event type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing Discord welcome event:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

