import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Project, ProjectInsert, ProjectUpdate, Milestone } from "@/types";
import { handleError, handleSuccess } from "@/utils/errorHandler";
import { retry } from "@/utils/retry";

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return retry(async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as Project[];
      }, 3, 1000);
    },
    staleTime: 30000,
    retry: 2,
  });
};

export const useProjectMilestones = (projectId: string) => {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectData: ProjectInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("projects")
        .insert([{ ...projectData, created_by: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      handleSuccess("Project created successfully");
    },
    onError: (error) => handleError(error, "Create Project"),
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectUpdate }) => {
      const { error } = await supabase
        .from("projects")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      handleSuccess("Project updated successfully");
    },
    onError: (error) => handleError(error, "Update Project"),
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related milestones first
      const { error: milestonesError } = await supabase
        .from("milestones")
        .delete()
        .eq("project_id", id);
      
      if (milestonesError) throw milestonesError;
      
      // Delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      handleSuccess("Project deleted successfully");
    },
    onError: (error) => handleError(error, "Delete Project"),
  });
};

