// Google Calendar Sync Handler
// This function handles two-way sync between app events and Google Calendar

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  colorId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action } = await req.json();

    // Get user's calendar connection
    const { data: connection, error: connError } = await supabaseClient
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Google Calendar connection found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Refresh token if needed
    let accessToken = connection.access_token;
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      accessToken = await refreshGoogleToken(connection.refresh_token);
      
      // Update token in database
      await supabaseClient
        .from("calendar_connections")
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
        .eq("id", connection.id);
    }

    if (action === "sync_to_google") {
      // Sync app events to Google Calendar
      const { events } = await req.json();
      
      if (!events || !Array.isArray(events)) {
        return new Response(
          JSON.stringify({ error: "Events array is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const calendarId = connection.calendar_id || "primary";
      const syncedEvents = [];

      for (const event of events) {
        try {
          const googleEvent: GoogleCalendarEvent = {
            summary: event.title,
            description: event.description || "",
            start: {
              dateTime: event.start_time || event.date,
              timeZone: "UTC",
            },
            end: {
              dateTime: event.end_time || event.date,
              timeZone: "UTC",
            },
            location: event.location,
            colorId: getColorIdForEventType(event.type),
          };

          // If event has google_event_id, update it; otherwise create new
          if (event.google_event_id) {
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.google_event_id}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(googleEvent),
              }
            );

            if (response.ok) {
              syncedEvents.push(await response.json());
            }
          } else {
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(googleEvent),
              }
            );

            if (response.ok) {
              const createdEvent = await response.json();
              syncedEvents.push(createdEvent);
              
              // Store google_event_id in the app's event record
              if (event.entity_type && event.entity_id) {
                await updateEventWithGoogleId(
                  supabaseClient,
                  event.entity_type,
                  event.entity_id,
                  createdEvent.id
                );
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing event ${event.id}:`, error);
        }
      }

      // Update last_sync_at
      await supabaseClient
        .from("calendar_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          syncedCount: syncedEvents.length,
          events: syncedEvents 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "sync_from_google") {
      // Sync Google Calendar events to app
      const calendarId = connection.calendar_id || "primary";
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch Google Calendar events");
      }

      const data = await response.json();
      const googleEvents = data.items || [];

      // Update last_sync_at
      await supabaseClient
        .from("calendar_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          events: googleEvents.map((e: any) => ({
            id: e.id,
            title: e.summary,
            description: e.description,
            start_time: e.start?.dateTime || e.start?.date,
            end_time: e.end?.dateTime || e.end?.date,
            location: e.location,
            google_event_id: e.id,
          }))
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Calendar sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

function getColorIdForEventType(type: string): string {
  // Google Calendar color IDs: 1-11
  const colorMap: Record<string, string> = {
    task: "9", // Blue
    milestone: "5", // Yellow
    meeting: "10", // Green
    deadline: "11", // Red
  };
  return colorMap[type] || "1";
}

async function updateEventWithGoogleId(
  supabase: any,
  entityType: string,
  entityId: string,
  googleEventId: string
) {
  // This would need to be implemented based on your schema
  // For now, we'll just store it in a generic way
  // You might want to add a google_event_id column to tasks, milestones, etc.
  try {
    if (entityType === "task") {
      await supabase
        .from("tasks")
        .update({ metadata: { google_event_id: googleEventId } })
        .eq("id", entityId);
    } else if (entityType === "milestone") {
      await supabase
        .from("milestones")
        .update({ metadata: { google_event_id: googleEventId } })
        .eq("id", entityId);
    }
  } catch (error) {
    console.error("Error updating event with Google ID:", error);
  }
}

