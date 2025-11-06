import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type UserRole = "team_leader" | "director" | "chief" | "member";
export type Department = "electrical" | "mechanical" | "operations";

export interface UserRoleData {
  role: UserRole;
  department: Department | null;
}

export function useUserRole(userId: string | undefined) {
  const [userRole, setUserRole] = useState<UserRoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, department")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        setUserRole(data);
      } catch (error: any) {
        console.error("Error fetching user role:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user role",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [userId, toast]);

  const isTeamLeader = userRole?.role === "team_leader";
  const isDirector = userRole?.role === "director";
  const isChief = userRole?.role === "chief";
  const isMember = userRole?.role === "member";
  const isLeadership = isTeamLeader || isDirector || isChief;

  return {
    userRole,
    loading,
    isTeamLeader,
    isDirector,
    isChief,
    isMember,
    isLeadership,
  };
}
