import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, Clock, XCircle, AlertCircle, FileText, 
  Users, MessageSquare, ArrowRight, Search, Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WorkflowDialog from "@/components/WorkflowDialog";

type ApprovalWorkflow = {
  id: string;
  document_id: string;
  workflow_type: string;
  current_step: number;
  total_steps: number;
  status: string;
  submitted_at: string | null;
  completed_at: string | null;
  documents: {
    id: string;
    title: string;
    document_type: string;
  } | null;
  approval_steps: ApprovalStep[];
};

type ApprovalStep = {
  id: string;
  step_number: number;
  approver_role: string | null;
  approver_id: string | null;
  status: string;
  comments: string | null;
  approved_at: string | null;
  approver?: {
    id: string;
    full_name: string;
  } | null;
};

const ApprovalWorkflows = () => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
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

  useEffect(() => {
    if (user) {
      fetchWorkflows();
    }
  }, [user]);

  useEffect(() => {
    let filtered = workflows;

    if (searchQuery) {
      filtered = filtered.filter(
        (wf) =>
          wf.documents?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wf.workflow_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((wf) => wf.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((wf) => wf.workflow_type === typeFilter);
    }

    setFilteredWorkflows(filtered);
  }, [workflows, searchQuery, statusFilter, typeFilter]);

  const fetchWorkflows = async () => {
    try {
      const { data: workflowsData, error: workflowsError } = await supabase
        .from("approval_workflows")
        .select(`
          *,
          documents(id, title, document_type),
          approval_steps(*)
        `)
        .order("created_at", { ascending: false });

      if (workflowsError) throw workflowsError;

      // Fetch approver profiles for each step
      const workflowsWithApprovers = await Promise.all(
        (workflowsData || []).map(async (wf: any) => {
          const stepsWithApprovers = await Promise.all(
            (wf.approval_steps || []).map(async (step: any) => {
              if (step.approver_id) {
                const { data: approver } = await supabase
                  .from("profiles")
                  .select("id, full_name")
                  .eq("id", step.approver_id)
                  .single();
                return { ...step, approver };
              }
              return step;
            })
          );
          return { ...wf, approval_steps: stepsWithApprovers };
        })
      );

      setWorkflows(workflowsWithApprovers);
      setFilteredWorkflows(workflowsWithApprovers);
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

  const handleApproveStep = async (workflowId: string, stepId: string, comments?: string) => {
    try {
      const { error } = await supabase
        .from("approval_steps")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          comments: comments || null,
          approver_id: user?.id,
        })
        .eq("id", stepId);

      if (error) throw error;

      // Check if all steps are approved
      const { data: steps } = await supabase
        .from("approval_steps")
        .select("*")
        .eq("workflow_id", workflowId);

      const allApproved = steps?.every((s) => s.status === "approved");

      if (allApproved) {
        await supabase
          .from("approval_workflows")
          .update({
            status: "approved",
            completed_at: new Date().toISOString(),
          })
          .eq("id", workflowId);

        await supabase
          .from("documents")
          .update({
            is_approved: true,
            approved_by: user?.id,
          })
          .eq("id", workflows.find((w) => w.id === workflowId)?.document_id || "");

        toast({
          title: "Workflow completed and document approved",
        });
      } else {
        toast({
          title: "Step approved successfully",
        });
      }

      fetchWorkflows();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleRejectStep = async (workflowId: string, stepId: string, comments: string) => {
    try {
      const { error } = await supabase
        .from("approval_steps")
        .update({
          status: "rejected",
          comments: comments,
          approver_id: user?.id,
        })
        .eq("id", stepId);

      if (error) throw error;

      await supabase
        .from("approval_workflows")
        .update({
          status: "rejected",
        })
        .eq("id", workflowId);

      toast({
        title: "Step rejected",
      });

      fetchWorkflows();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "in_review":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "submitted":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: "bg-green-500/20 text-green-700 dark:text-green-400",
      rejected: "bg-red-500/20 text-red-700 dark:text-red-400",
      in_review: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      submitted: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      draft: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
      revision_requested: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    };
    return colors[status] || colors.draft;
  };

  const getWorkflowTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      eso_qualification: "ESO Qualification",
      business_plan_video: "Business Plan Video",
      technical_report: "Technical Report",
      standard: "Standard Document",
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Approval Workflows</h1>
            <p className="text-muted-foreground">
              Manage automated approval workflows for documents
            </p>
          </div>
          <Button onClick={() => setWorkflowDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="eso_qualification">ESO Qualification</SelectItem>
              <SelectItem value="business_plan_video">Business Plan Video</SelectItem>
              <SelectItem value="technical_report">Technical Report</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No workflows found</p>
              <p className="text-sm text-muted-foreground">
                Approval workflows will appear here when documents are submitted
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(workflow.status)}
                      <div>
                        <CardTitle>{workflow.documents?.title || "Unknown Document"}</CardTitle>
                        <CardDescription className="mt-1">
                          {getWorkflowTypeLabel(workflow.workflow_type)} • Step {workflow.current_step} of {workflow.total_steps}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusBadge(workflow.status)}>
                      {workflow.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Approval Steps */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Approval Steps</h4>
                      {workflow.approval_steps
                        .sort((a, b) => a.step_number - b.step_number)
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Step {step.step_number}
                                </span>
                                {step.approver_role && (
                                  <Badge variant="outline" className="text-xs">
                                    {step.approver_role}
                                  </Badge>
                                )}
                                <Badge
                                  className={
                                    step.status === "approved"
                                      ? "bg-green-500/20 text-green-700"
                                      : step.status === "rejected"
                                      ? "bg-red-500/20 text-red-700"
                                      : "bg-gray-500/20 text-gray-700"
                                  }
                                >
                                  {step.status}
                                </Badge>
                              </div>
                              {step.approver && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Approver: {step.approver.full_name}
                                </p>
                              )}
                              {step.comments && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {step.comments}
                                </p>
                              )}
                            </div>
                            {step.status === "pending" && index === workflow.current_step - 1 && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveStep(workflow.id, step.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const comments = prompt("Rejection reason:");
                                    if (comments) {
                                      handleRejectStep(workflow.id, step.id, comments);
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {workflow.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(workflow.submitted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <WorkflowDialog
          open={workflowDialogOpen}
          onOpenChange={setWorkflowDialogOpen}
          onSuccess={fetchWorkflows}
        />
      </div>
    </DashboardLayout>
  );
};

export default ApprovalWorkflows;

