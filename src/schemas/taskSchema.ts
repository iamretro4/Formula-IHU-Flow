import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid("Project is required"),
});

export type TaskFormData = z.infer<typeof taskSchema>;

