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

      const { data, error } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as CalendarConnection | null;
    },
    staleTime: 30000,
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

      const { error } = await supabase
        .from("calendar_connections")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("provider", "google");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connection"] });
      handleSuccess("Calendar disconnected successfully");
    },
    onError: (error) => handleError(error, "Disconnect Calendar"),
  });
};

