import { toast } from "@/hooks/use-toast";

export const handleError = (error: unknown, context?: string) => {
  const message = error instanceof Error 
    ? error.message 
    : typeof error === "string"
    ? error
    : "An unexpected error occurred";
  
  const errorContext = context ? `[${context}]` : "";
  console.error(`${errorContext} ${message}`, error);
  
  toast({
    variant: "destructive",
    title: "Error",
    description: message,
  });
  
  return message;
};

export const handleSuccess = (message: string, description?: string) => {
  toast({
    title: message,
    description,
  });
};

