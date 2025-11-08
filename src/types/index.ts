import { Database } from "@/integrations/supabase/types";

// Profile types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// Task types
export type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  projects?: { id: string; name: string } | null;
  assigned_to_profile?: { id: string; full_name: string } | null;
};
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

// Document types
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

// Project types
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

// Milestone types
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
export type MilestoneInsert = Database["public"]["Tables"]["milestones"]["Insert"];

// Chart data type
export type ChartData = { name: string; value: number };

// Budget types
export type Budget = Database["public"]["Tables"]["budgets"]["Row"] & {
  projects?: { id: string; name: string } | null;
};

// Expense types
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];

// Income types
export type Income = Database["public"]["Tables"]["income"]["Row"];

// Purchase Request types
export type PurchaseRequest = Database["public"]["Tables"]["purchase_requests"]["Row"] & {
  requested_by_profile?: { id: string; full_name: string } | null;
};

// Activity types
export type Activity = Database["public"]["Tables"]["activity_log"]["Row"] & {
  user?: { id: string; full_name: string } | null;
};

// Bottleneck types
export type Bottleneck = Database["public"]["Tables"]["bottlenecks"]["Row"] & {
  tasks?: { id: string; title: string } | null;
  projects?: { id: string; name: string } | null;
};

// Comment types
export type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
  author?: { id: string; full_name: string } | null;
  replies?: Comment[];
  reactions?: { reaction_type: string; count: number }[];
};

// Channel types
export type Channel = Database["public"]["Tables"]["channels"]["Row"];

// Message types
export type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  author?: { id: string; full_name: string } | null;
};

// Workflow types
export type Workflow = Database["public"]["Tables"]["approval_workflows"]["Row"];

