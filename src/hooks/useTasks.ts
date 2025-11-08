import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskInsert, TaskUpdate } from "@/types";
import { handleError, handleSuccess } from "@/utils/errorHandler";
import { retry } from "@/utils/retry";

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      return retry(async () => {
        const { data, error } = await supabase
          .from("tasks")
          .select("*, projects(id, name)")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        // Fetch profiles for assigned users
        const assignedUserIds = [...new Set(
          (data || []).map((t) => t.assigned_to).filter(Boolean)
        )];
        
        let profilesMap: Record<string, { id: string; full_name: string }> = {};
        if (assignedUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", assignedUserIds);
          
          if (profilesData) {
            profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, { id: string; full_name: string }>);
          }
        }
        
        return (data || []).map((task) => ({
          ...task,
          assigned_to_profile: task.assigned_to 
            ? profilesMap[task.assigned_to] || null 
            : null,
        })) as Task[];
      }, 3, 1000);
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: TaskInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("tasks")
        .insert([{ ...taskData, created_by: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleSuccess("Task created successfully");
    },
    onError: (error) => handleError(error, "Create Task"),
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskUpdate }) => {
      const { error } = await supabase
        .from("tasks")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleSuccess("Task updated successfully");
    },
    onError: (error) => handleError(error, "Update Task"),
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleSuccess("Task deleted successfully");
    },
    onError: (error) => handleError(error, "Delete Task"),
  });
};

