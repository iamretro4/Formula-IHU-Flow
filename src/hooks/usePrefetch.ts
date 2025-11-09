import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for prefetching data for likely next routes
 * Improves perceived performance by loading data before user navigates
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchTasks = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["tasks"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tasks")
          .select("*, projects(id, name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: 30000,
    });
  }, [queryClient]);

  const prefetchDocuments = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["documents"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: 30000,
    });
  }, [queryClient]);

  const prefetchProjects = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["projects"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
      staleTime: 30000,
    });
  }, [queryClient]);

  return {
    prefetchTasks,
    prefetchDocuments,
    prefetchProjects,
  };
}

