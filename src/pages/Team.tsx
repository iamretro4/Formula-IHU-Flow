import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Phone, Users as UsersIcon, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMemberDialog } from "@/components/TeamMemberDialog";
import { WorkloadProductivityCard } from "@/components/WorkloadProductivityCard";
import { calculateAllWorkloads, calculateAllProductivity } from "@/lib/workload";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { exportToCSV } from "@/utils/export";
import { Download } from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  sub_team: string | null;
  skills: string[] | null;
  certifications: string[] | null;
  avatar_url: string | null;
  is_active: boolean;
};

type UserWithRole = Profile & {
  user_roles: Array<{
    role: string;
    department: string | null;
  }> | null;
};

const Team = () => {
  const [members, setMembers] = useState<UserWithRole[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserWithRole | undefined>(undefined);
  const [showWorkload, setShowWorkload] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const {
    paginatedData: paginatedMembers,
    currentPage,
    totalPages,
    goToPage,
  } = usePagination(members, itemsPerPage);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // All users are admins - no role checks needed

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch roles separately for each user
      const membersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role, department")
            .eq("user_id", profile.id);
          
          return { ...profile, user_roles: roles };
        })
      );

      setMembers(membersWithRoles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Role badges removed - everyone is admin

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExport = () => {
    const csvData = members.map((member) => ({
      Name: member.full_name,
      Email: member.email,
      Phone: member.phone || "",
      Department: member.department || "",
      "Sub Team": member.sub_team || "",
      Role: member.user_roles?.[0]?.role || "member",
      "Is Active": member.is_active ? "Yes" : "No",
    }));

    exportToCSV(csvData, `team-${new Date().toISOString().split("T")[0]}`, [
      "Name",
      "Email",
      "Phone",
      "Department",
      "Sub Team",
      "Role",
      "Is Active",
    ]);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Members</h1>
            <p className="text-muted-foreground">Manage your Formula IHU team</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showWorkload ? "default" : "outline"}
              onClick={() => setShowWorkload(!showWorkload)}
            >
              {showWorkload ? "Hide" : "Show"} Workload & Productivity
            </Button>
            <Button 
              variant="outline"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => { setSelectedMember(undefined); setDialogOpen(true); }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>

        <TeamMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          member={selectedMember}
          onSuccess={fetchTeamMembers}
        />

        {showWorkload && !loading && members.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Workload & Productivity</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const workloads = calculateAllWorkloads(
                  [{ id: member.id, full_name: member.full_name }],
                  tasks
                );
                const productivities = calculateAllProductivity(
                  [{ id: member.id, full_name: member.full_name }],
                  tasks
                );
                const workload = workloads[0];
                const productivity = productivities[0];

                if (!workload || !productivity) return null;

                return (
                  <WorkloadProductivityCard
                    key={member.id}
                    workload={workload}
                    productivity={productivity}
                  />
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No team members yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first team member to get started
              </p>
              <Button onClick={() => { setSelectedMember(undefined); setDialogOpen(true); }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedMembers.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-racing text-primary-foreground">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{member.full_name}</CardTitle>
                            <CardDescription className="text-sm">
                              {member.sub_team || "No sub-team"}
                            </CardDescription>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setSelectedMember(member); setDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Badge variant="outline">Admin</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-2 h-4 w-4" />
                        {member.phone}
                      </div>
                    )}
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {member.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={members.length}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Team;
