// Supabase Edge Function for Discord Gateway Events
// This function connects to Discord Gateway and listens for member join events
// It then calls the discord-welcome function to send automatic welcome messages

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") || "";
const WELCOME_FUNCTION_URL = Deno.env.get("WELCOME_FUNCTION_URL") || 
  "https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-welcome";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Forwards a Gateway event to the welcome function
 */
async function forwardToWelcomeFunction(event: any): Promise<boolean> {
  try {
    const response = await fetch(WELCOME_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "guild_member_add",
        guild_id: event.guild_id,
        user: event.user || event.member?.user,
        member: event.member,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error forwarding to welcome function:", error);
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
    const body = await req.json();

    // Handle Discord Gateway events
    // This endpoint can be called by a Gateway bot or webhook service
    if (body.t === "GUILD_MEMBER_ADD" || body.event === "GUILD_MEMBER_ADD") {
      const success = await forwardToWelcomeFunction(body.d || body);

      return new Response(
        JSON.stringify({ success, message: "Event forwarded to welcome function" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Health check
    if (body.type === "ping" || body.ping) {
      return new Response(
        JSON.stringify({ status: "ok", message: "Discord Gateway handler is running" }),
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
    console.error("Error processing Gateway event:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

