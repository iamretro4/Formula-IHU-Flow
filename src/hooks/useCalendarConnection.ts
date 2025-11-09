import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleError, handleSuccess } from "@/utils/errorHandler";

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: "google" | "outlook" | "ical";
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useCalendarConnection = () => {
  return useQuery({
    queryKey: ["calendar-connection"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase
        .from("calendar_connections" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .eq("is_active", true)
        .maybeSingle()) as { data: CalendarConnection | null; error: any };

      // Handle errors gracefully
      if (error) {
        // PGRST116 = no rows returned (this is fine)
        if (error.code === "PGRST116") {
          return null;
        }
        // 42P01 = relation does not exist (table doesn't exist yet)
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          console.warn("calendar_connections table does not exist yet");
          return null;
        }
        // For other errors, log but don't break the app
        console.error("Error fetching calendar connection:", error);
        return null;
      }

      return data as CalendarConnection | null;
    },
    staleTime: 30000,
    retry: false, // Don't retry on error to avoid spam
  });
};

export const useInitiateGoogleCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-calendar-oauth", {
          body: { action: "initiate" },
        });

        if (error) {
          console.error("Edge Function error:", error);
          // Check for specific error types
          if (error.message?.includes("Function not found") || error.message?.includes("404")) {
            throw new Error(
              "Edge Function 'google-calendar-oauth' is not deployed. Please deploy it in Supabase Dashboard > Edge Functions. See DEPLOY_EDGE_FUNCTION.md for instructions."
            );
          }
          throw new Error(error.message || "Failed to invoke Edge Function");
        }

        if (!data) {
          throw new Error("No data returned from Edge Function");
        }

        if (!data.authUrl) {
          const errorMsg = data.error || "Failed to get OAuth URL";
          const details = data.details || "";
          throw new Error(`${errorMsg}${details ? `: ${details}` : ""}`);
        }

        return data.authUrl;
      } catch (error: any) {
        console.error("Error initiating Google Calendar:", error);
        // Provide more helpful error messages
        if (error.message?.includes("Failed to invoke")) {
          throw new Error(
            "Edge Function not deployed or not accessible. Please ensure the 'google-calendar-oauth' function is deployed."
          );
        }
        throw error;
      }
    },
    onSuccess: (authUrl) => {
      // Redirect to Google OAuth
      window.location.href = authUrl;
    },
    onError: (error) => handleError(error, "Initiate Google Calendar"),
  });
};

export const useDisconnectCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase
        .from("calendar_connections" as any)
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("provider", "google")) as { error: any };

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connection"] });
      handleSuccess("Calendar disconnected successfully");
    },
    onError: (error) => handleError(error, "Disconnect Calendar"),
  });
};

