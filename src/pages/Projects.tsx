import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Target, TrendingUp, CheckCircle2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectDialog } from "@/components/ProjectDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ProjectTasksView } from "@/components/ProjectTasksView";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  competition_date: string | null;
  created_at: string;
};

type Milestone = {
  id: string;
  project_id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
  const [selectedProjectForMilestone, setSelectedProjectForMilestone] = useState<string>("");
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | undefined>(undefined);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      const { data: milestonesData, error: milestonesError } = await supabase
        .from("milestones")
        .select("*")
        .order("due_date", { ascending: true });

      if (milestonesError) throw milestonesError;

      // Fetch tasks with profiles and projects
      // Note: tasks has both assigned_to and created_by foreign keys to profiles
      // We'll fetch tasks first, then fetch profiles separately to avoid ambiguity
      const { data: tasksDataRaw, error: tasksError } = await supabase
        .from("tasks")
        .select("*, projects(id, name)")
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch profiles for assigned users
      const assignedUserIds = [...new Set((tasksDataRaw || [])
        .map((t: any) => t.assigned_to)
        .filter(Boolean))];
      
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

      // Map tasks with profile data
      const tasksData = (tasksDataRaw || []).map((task: any) => ({
        ...task,
        assigned_to_profile: task.assigned_to ? profilesMap[task.assigned_to] || null : null,
      }));

      // Group milestones by project
      const milestonesByProject: Record<string, Milestone[]> = {};
      milestonesData?.forEach((milestone) => {
        if (!milestonesByProject[milestone.project_id]) {
          milestonesByProject[milestone.project_id] = [];
        }
        milestonesByProject[milestone.project_id].push(milestone);
      });

      setProjects(projectsData || []);
      setMilestones(milestonesByProject);
      setTasks(tasksData || []);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: "bg-muted text-muted-foreground",
      active: "bg-accent/20 text-accent-foreground",
      on_hold: "bg-warning/20 text-warning-foreground",
      completed: "bg-success/20 text-success-foreground",
    };
    return colors[status] || colors.planning;
  };

  const getProjectProgress = (projectId: string) => {
    const projectMilestones = milestones[projectId] || [];
    if (projectMilestones.length === 0) return 0;
    const completed = projectMilestones.filter(m => m.is_completed).length;
    return Math.round((completed / projectMilestones.length) * 100);
  };

  const getDaysUntilDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const toggleMilestoneComplete = async (milestoneId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from("milestones")
        .update({ 
          is_completed: !isCompleted,
          completion_date: !isCompleted ? new Date().toISOString().split('T')[0] : null,
        })
        .eq("id", milestoneId);

      if (error) throw error;

      toast({ title: `Milestone ${!isCompleted ? 'completed' : 'reopened'}` });
      fetchProjects();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects & Milestones</h1>
            <p className="text-muted-foreground">Track project progress and timelines</p>
          </div>
          <Button onClick={() => { setSelectedProject(undefined); setProjectDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <ProjectDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          project={selectedProject}
          onSuccess={fetchProjects}
        />

        <MilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          projectId={selectedProjectForMilestone}
          milestone={selectedMilestone}
          onSuccess={fetchProjects}
        />

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No projects yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <Button onClick={() => { setSelectedProject(undefined); setProjectDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => {
              const progress = getProjectProgress(project.id);
              const projectMilestones = milestones[project.id] || [];
              const daysUntilEnd = getDaysUntilDate(project.end_date);

              return (
                <Card key={project.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-2xl">{project.name}</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setSelectedProject(project); setProjectDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription className="text-base">
                          {project.description || "No description"}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Project Timeline */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Start Date</p>
                          <p className="text-sm font-medium">
                            {new Date(project.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">End Date</p>
                          <p className="text-sm font-medium">
                            {new Date(project.end_date).toLocaleDateString()}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({daysUntilEnd > 0 ? `${daysUntilEnd} days left` : `${Math.abs(daysUntilEnd)} days overdue`})
                            </span>
                          </p>
                        </div>
                      </div>
                      {project.competition_date && (
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Competition</p>
                            <p className="text-sm font-medium">
                              {new Date(project.competition_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Milestones Timeline */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Milestones</h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedProjectForMilestone(project.id);
                            setSelectedMilestone(undefined);
                            setMilestoneDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {projectMilestones.length > 0 ? (
                        <div className="space-y-2">
                          {projectMilestones.map((milestone) => (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => toggleMilestoneComplete(milestone.id, milestone.is_completed)}
                            >
                              <div className={`flex-shrink-0 ${milestone.is_completed ? 'text-success' : 'text-muted-foreground'}`}>
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${milestone.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {milestone.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                                </p>
                              </div>
                              {milestone.is_completed && (
                                <Badge variant="outline" className="bg-success/10 text-success-foreground">
                                  Completed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No milestones yet. Click Add to create one.
                        </p>
                      )}
                    </div>

                    {/* Tasks View Toggle */}
                    <div className="space-y-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                      >
                        {expandedProject === project.id ? "Hide" : "Show"} Tasks
                      </Button>
                      {expandedProject === project.id && (
                        <ProjectTasksView
                          projectId={project.id}
                          projectName={project.name}
                          tasks={tasks}
                          onTaskUpdate={fetchProjects}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;
