import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Document, DocumentInsert, DocumentUpdate } from "@/types";
import { handleError, handleSuccess } from "@/utils/errorHandler";
import { retry } from "@/utils/retry";

export const useDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      return retry(async () => {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data || []) as Document[];
      }, 3, 1000);
    },
    staleTime: 30000,
    retry: 2,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (documentData: DocumentInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("documents")
        .insert([{ ...documentData, created_by: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      handleSuccess("Document created successfully");
    },
    onError: (error) => handleError(error, "Create Document"),
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DocumentUpdate }) => {
      const { error } = await supabase
        .from("documents")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      handleSuccess("Document updated successfully");
    },
    onError: (error) => handleError(error, "Update Document"),
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the document to check if it has a file
      const { data: document, error: fetchError } = await supabase
        .from("documents")
        .select("file_url")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the file from storage if it exists
      if (document?.file_url) {
        const filePath = document.file_url.split("/").slice(-2).join("/");
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([filePath]);
        
        // Don't throw if file doesn't exist in storage
        if (storageError && !storageError.message.includes("not found")) {
          console.warn("Error deleting file from storage:", storageError);
        }
      }
      
      // Delete the document record
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-documents"] });
      handleSuccess("Document deleted successfully");
    },
    onError: (error) => handleError(error, "Delete Document"),
  });
};

