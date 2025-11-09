// Google Calendar OAuth Handler
// This function handles the OAuth flow for Google Calendar integration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle OAuth callback (GET request with query params)
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(
        JSON.stringify({ error: `OAuth error: ${error}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle callback from Google OAuth
    if (code && state) {
      // Exchange code for tokens
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const baseUrl = supabaseUrl.replace(/\/rest\/v1$/, "").replace(/\/$/, "");
      const redirectUri = `${baseUrl}/functions/v1/google-calendar-oauth`;

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      // Get calendar info
      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );
      const calendarData = await calendarResponse.json();

      // Store tokens in database
      const { error: dbError } = await supabaseClient
        .from("calendar_connections")
        .upsert({
          user_id: user.id,
          provider: "google",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          calendar_id: calendarData.id || "primary",
          calendar_name: calendarData.summary || "Primary Calendar",
          is_active: true,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,provider",
        });

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/calendar?connected=true`,
        },
      });
    }

    // Handle initiate action (POST request)
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: e.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action } = requestBody || {};

    if (action === "initiate") {
      // Generate OAuth URL
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      
      if (!clientId) {
        return new Response(
          JSON.stringify({ 
            error: "GOOGLE_CLIENT_ID not configured",
            details: "Please set GOOGLE_CLIENT_ID in Supabase Edge Function environment variables"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (!supabaseUrl) {
        return new Response(
          JSON.stringify({ error: "SUPABASE_URL not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Clean up SUPABASE_URL - remove /rest/v1 if present
      const baseUrl = supabaseUrl.replace(/\/rest\/v1$/, "").replace(/\/$/, "");
      const redirectUri = `${baseUrl}/functions/v1/google-calendar-oauth`;
      const scope = "https://www.googleapis.com/auth/calendar";
      const stateParam = crypto.randomUUID();

      // Log for debugging (remove in production if needed)
      console.log("OAuth redirect URI:", redirectUri);
      console.log("Client ID configured:", !!clientId);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${stateParam}`;

      return new Response(
        JSON.stringify({ authUrl, state: stateParam }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action", received: action }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

