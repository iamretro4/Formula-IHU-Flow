// Supabase Edge Function for Discord Interactions
// Handles Discord slash commands and verifies Ed25519 signatures

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://esm.sh/tweetnacl@1.0.3";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") || "";
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscordInteraction {
  type: number;
  id?: string;
  token?: string;
  guild_id?: string;
  data?: {
    name: string;
    custom_id?: string;
    component_type?: number;
    options?: Array<{
      name: string;
      value: string;
    }>;
  };
  member?: {
    user?: {
      id: string;
      username: string;
    };
    roles?: string[];
  };
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Verifies the Discord Ed25519 signature
 */
async function verifyDiscordSignature(
  request: Request,
  body: string
): Promise<boolean> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (!signature || !timestamp || !DISCORD_PUBLIC_KEY) {
    return false;
  }

  try {
    // Convert public key from hex string to Uint8Array
    const publicKeyBytes = Uint8Array.from(
      DISCORD_PUBLIC_KEY.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Combine timestamp and body for verification
    const message = new TextEncoder().encode(timestamp + body);

    // Convert signature from hex string to Uint8Array
    const signatureBytes = Uint8Array.from(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // Verify the signature
    return verify.detached(message, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Handles PING interaction (type 1)
 */
function handlePing(): Response {
  return new Response(
    JSON.stringify({ type: 1 }), // PONG response
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Gets Supabase user profile from Discord user ID
 */
async function getProfileFromDiscord(
  discordUserId: string,
  supabaseClient: any
): Promise<any> {
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id, full_name, discord_user_id")
    .eq("discord_user_id", discordUserId)
    .single();
  return profile;
}

/**
 * Handles the /addtask slash command
 */
async function handleAddTask(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  // Get the content option from the command
  const contentOption = interaction.data?.options?.find(
    (opt) => opt.name === "content"
  );

  if (!contentOption || !contentOption.value) {
    return new Response(
      JSON.stringify({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "❌ Error: Content is required for the task.",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const content = contentOption.value;
  
  // Get Discord user ID (can be from member.user or user depending on context)
  const discordUserId = interaction.member?.user?.id || interaction.user?.id || null;

  try {
    // Insert task into Supabase
    // Try to use 'content' column first, fallback to 'title' if it doesn't exist
    const taskData: any = {
      content: content, // Primary: use content column
      status: "pending",
    };
    
    // Add discord_user_id if provided
    if (discordUserId) {
      taskData.discord_user_id = discordUserId;
    }
    
    const { data, error } = await supabaseClient
      .from("tasks")
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: `❌ Error adding task: ${error.message}`,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `✅ Task added: ${content}`,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error handling addtask:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `❌ Error: ${error.message}`,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handles the /listtasks slash command
 */
async function handleListTasks(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  
  if (!discordUserId) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Error: Could not identify Discord user." },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get user's Supabase profile from discord_user_id
    const profile = await getProfileFromDiscord(discordUserId, supabaseClient);
    
    if (!profile) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Your Discord account is not linked. Use `/linkaccount` to link your account first.",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get tasks created by this user
    const { data: tasks, error } = await supabaseClient
      .from("tasks")
      .select("id, content, title, status, created_at")
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "📋 You have no tasks yet. Use `/addtask` to create one!",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const taskList = tasks.map((t: any, i: number) => {
      const taskContent = t.content || t.title || "Untitled";
      const statusEmoji = t.status === "completed" ? "✅" : t.status === "in_progress" ? "🔄" : "⏳";
      return `${i + 1}. ${statusEmoji} ${taskContent} [${t.status}]`;
    }).join("\n");
    
    // Add interactive buttons for first task if available
    const components = tasks.length > 0 && tasks[0].status !== "completed" ? [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS (green)
            label: "Complete Task",
            custom_id: `complete_task_${tasks[0].id}`,
          },
        ],
      },
    ] : [];
    
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `📋 **Your Tasks (${tasks.length}):**\n${taskList}`,
          components: components,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error handling listtasks:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: `❌ Error: ${error.message}` },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles the /mytasks slash command (tasks assigned to user)
 */
async function handleMyTasks(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  
  if (!discordUserId) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Error: Could not identify Discord user." },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const profile = await getProfileFromDiscord(discordUserId, supabaseClient);
    
    if (!profile) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Your Discord account is not linked. Use `/linkaccount` to link your account first.",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get tasks assigned to this user
    const { data: tasks, error } = await supabaseClient
      .from("tasks")
      .select("id, content, title, status, priority, due_date, created_at")
      .eq("assigned_to", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "📋 You have no assigned tasks. You're all caught up! 🎉",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const taskList = tasks.map((t: any, i: number) => {
      const taskContent = t.content || t.title || "Untitled";
      const statusEmoji = t.status === "completed" ? "✅" : t.status === "in_progress" ? "🔄" : "⏳";
      const priorityEmoji = t.priority === "critical" ? "🔴" : t.priority === "high" ? "🟠" : t.priority === "medium" ? "🟡" : "🟢";
      return `${i + 1}. ${statusEmoji} ${priorityEmoji} ${taskContent} [${t.status}]`;
    }).join("\n");
    
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `📋 **Tasks Assigned to You (${tasks.length}):**\n${taskList}`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error handling mytasks:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: `❌ Error: ${error.message}` },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles the /completetask slash command
 */
async function handleCompleteTask(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const taskIdOption = interaction.data?.options?.find(opt => opt.name === "id");
  
  if (!discordUserId) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Error: Could not identify Discord user." },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!taskIdOption || !taskIdOption.value) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Error: Task ID is required. Use `/listtasks` to see your task IDs." },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const profile = await getProfileFromDiscord(discordUserId, supabaseClient);
    
    if (!profile) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Your Discord account is not linked. Use `/linkaccount` to link your account first.",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update task status to completed
    const { data: task, error } = await supabaseClient
      .from("tasks")
      .update({ 
        status: "completed",
        completion_date: new Date().toISOString()
      })
      .eq("id", taskIdOption.value)
      .eq("created_by", profile.id) // Only allow completing own tasks
      .select()
      .single();
    
    if (error) throw error;
    
    if (!task) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Task not found or you don't have permission to complete it.",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const taskContent = task.content || task.title || "Task";
    
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `✅ Task completed: ${taskContent}`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error handling completetask:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: `❌ Error: ${error.message}` },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles the /setupwelcome slash command (admin only)
 */
async function handleSetupWelcome(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  const guildId = interaction.guild_id;
  const channelOption = interaction.data?.options?.find(opt => opt.name === "channel");
  
  if (!guildId) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "❌ This command can only be used in a server.",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!channelOption || !channelOption.value) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "❌ Please specify a channel. Usage: `/setupwelcome channel:#roles`",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Extract channel ID from the option (format: <#channel_id>)
    const channelId = channelOption.value.replace(/[<#>]/g, "");
    
    // Send role selection message
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send message: ${errorText}`);
    }

    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `✅ Role selection message sent to <#${channelId}>! Users can now select their roles.`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error setting up welcome:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: `❌ Error: ${error.message}` },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles the /linkaccount slash command
 */
async function handleLinkAccount(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const discordUsername = interaction.member?.user?.username || interaction.user?.username;
  const codeOption = interaction.data?.options?.find(opt => opt.name === "code");
  
  if (!discordUserId) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Error: Could not identify Discord user." },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!codeOption || !codeOption.value) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "❌ Please provide a linking code from the app.\n\n**How to get your code:**\n1. Go to Settings → Discord Integration in the app\n2. Click 'Generate Link Code'\n3. Use that code here: `/linkaccount code:YOUR_CODE`",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Find profile with matching link code
    const { data: profile, error: findError } = await supabaseClient
      .from("profiles")
      .select("id, full_name, discord_link_code")
      .eq("discord_link_code", codeOption.value.toUpperCase())
      .single();
    
    if (findError || !profile) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Invalid linking code. Please check the code and try again.\n\nMake sure you:\n1. Generated a code in the app\n2. Used the code within a few minutes\n3. Typed it correctly (case-sensitive)",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if Discord account is already linked to another profile
    const { data: existingLink } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("discord_user_id", discordUserId)
      .single();
    
    if (existingLink && existingLink.id !== profile.id) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: `❌ This Discord account is already linked to another user (${existingLink.full_name || "Unknown"}).`,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Link the account
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ 
        discord_user_id: discordUserId,
        discord_link_code: null // Clear the code after use
      })
      .eq("id", profile.id);
    
    if (updateError) throw updateError;
    
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: `✅ Account linked successfully! Welcome, ${profile.full_name || discordUsername}!\n\nYou can now use:\n• \`/listtasks\` - View your tasks\n• \`/mytasks\` - View assigned tasks\n• \`/completetask\` - Complete tasks\n• \`/addtask\` - Create new tasks`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error handling linkaccount:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: `❌ Error: ${error.message}` },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles button interactions (type 3)
 */
async function handleButtonInteraction(
  interaction: DiscordInteraction,
  supabaseClient: any
): Promise<Response> {
  const discordUserId = interaction.member?.user?.id || interaction.user?.id;
  const customId = interaction.data?.custom_id;
  
  if (!discordUserId || !customId) {
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Error processing button interaction." },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Handle role selection buttons (no account linking required)
    if (customId.startsWith("role_")) {
      const guildId = interaction.guild_id;
      
      if (!guildId) {
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: "❌ Could not identify server. Please try again.",
              flags: 64,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Map role custom IDs to actual Discord role IDs
      const roleMapping: Record<string, string> = {
        "role_board": Deno.env.get("DISCORD_ROLE_BOARD") || "1443303554503676067",
        "role_technical": Deno.env.get("DISCORD_ROLE_TECHNICAL") || "1443303903226761337",
        "role_electrical": Deno.env.get("DISCORD_ROLE_ELECTRICAL") || "1443304060886188204",
        "role_business": Deno.env.get("DISCORD_ROLE_BUSINESS") || "1443304154536607805",
        "role_ses": Deno.env.get("DISCORD_ROLE_SES") || "1443304364818169866",
        "role_iad": Deno.env.get("DISCORD_ROLE_IAD") || "1443304498637574335",
        "role_ases": Deno.env.get("DISCORD_ROLE_ASES") || "1443304529188880598",
        "role_cost_event": Deno.env.get("DISCORD_ROLE_COST_EVENT") || "1443304586176630794",
        "role_design_event": Deno.env.get("DISCORD_ROLE_DESIGN_EVENT") || "1443304758667640903",
        "role_bpp": Deno.env.get("DISCORD_ROLE_BPP") || "1443304815441608734",
      };
      
      const actualRoleId = roleMapping[customId];
      
      if (!actualRoleId) {
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: "❌ Role not configured. Please contact an administrator.",
              flags: 64,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Assign the role
      try {
        const assignResponse = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${actualRoleId}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            },
          }
        );
        
        if (!assignResponse.ok) {
          const errorText = await assignResponse.text();
          console.error("Discord API error:", errorText);
          throw new Error("Failed to assign role");
        }
        
        // Update user's role in Supabase profile if linked
        const profile = await getProfileFromDiscord(discordUserId, supabaseClient);
        if (profile) {
          await supabaseClient
            .from("profiles")
            .update({ discord_role: customId })
            .eq("id", profile.id);
        }
        
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: `✅ Role assigned successfully! Welcome to the team! 🎉`,
              flags: 64,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error: any) {
        console.error("Error assigning role:", error);
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: "❌ Failed to assign role. Please try again or contact an administrator.",
              flags: 64,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // For other buttons, check if account is linked
    const profile = await getProfileFromDiscord(discordUserId, supabaseClient);
    
    if (!profile) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Your Discord account is not linked. Use `/linkaccount` first.",
            flags: 64, // EPHEMERAL - only visible to user
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle complete task button
    if (customId.startsWith("complete_task_")) {
      const taskId = customId.replace("complete_task_", "");
      
      const { data: task, error } = await supabaseClient
        .from("tasks")
        .update({ 
          status: "completed",
          completion_date: new Date().toISOString()
        })
        .eq("id", taskId)
        .eq("created_by", profile.id)
        .select()
        .single();
      
      if (error || !task) {
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: "❌ Could not complete task. Make sure you own this task.",
              flags: 64,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          type: 7, // UPDATE_MESSAGE
          data: {
            content: `✅ Task completed: ${task.content || task.title || "Task"}`,
            components: [], // Remove buttons
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "❌ Unknown button action.", flags: 64 },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error handling button interaction:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: `❌ Error: ${error.message}`, flags: 64 },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
    // Read the request body as text for signature verification
    const bodyText = await req.text();
    
    // Verify Discord signature
    const isValid = await verifyDiscordSignature(req, bodyText);
    if (!isValid) {
      console.error("Invalid Discord signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the interaction JSON
    const interaction: DiscordInteraction = JSON.parse(bodyText);

    // Handle PING (type 1)
    if (interaction.type === 1) {
      return handlePing();
    }

    // Handle APPLICATION_COMMAND (type 2) - Slash commands
    if (interaction.type === 2) {
      // Initialize Supabase client
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Route to appropriate command handler
      const commandName = interaction.data?.name;
      
      if (commandName === "addtask") {
        return await handleAddTask(interaction, supabaseClient);
      } else if (commandName === "listtasks") {
        return await handleListTasks(interaction, supabaseClient);
      } else if (commandName === "mytasks") {
        return await handleMyTasks(interaction, supabaseClient);
      } else if (commandName === "completetask") {
        return await handleCompleteTask(interaction, supabaseClient);
      } else if (commandName === "linkaccount") {
        return await handleLinkAccount(interaction, supabaseClient);
      } else if (commandName === "setupwelcome") {
        return await handleSetupWelcome(interaction, supabaseClient);
      }

      // Unknown command
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "❌ Unknown command. Available commands: `/addtask`, `/listtasks`, `/mytasks`, `/completetask`, `/linkaccount`, `/setupwelcome`",
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle MESSAGE_COMPONENT (type 3) - Button interactions
    if (interaction.type === 3) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      return await handleButtonInteraction(interaction, supabaseClient);
    }

    // Unknown interaction type
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: "❌ Unknown interaction type",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing Discord interaction:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

