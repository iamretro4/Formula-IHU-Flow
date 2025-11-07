import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface WorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WorkflowDialog = ({ open, onOpenChange, onSuccess }: WorkflowDialogProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [workflowType, setWorkflowType] = useState<string>("standard");
  const [steps, setSteps] = useState<Array<{ step_number: number; approver_ids: string[] }>>([
    { step_number: 1, approver_ids: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDocuments();
      fetchProfiles();
    }
  }, [open]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, document_type")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load documents",
      });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load profiles",
      });
    }
  };

  const addStep = () => {
    setSteps([...steps, { step_number: steps.length + 1, approver_ids: [] }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const toggleApprover = (stepIndex: number, approverId: string) => {
    const newSteps = [...steps];
    const step = newSteps[stepIndex];
    if (step.approver_ids.includes(approverId)) {
      step.approver_ids = step.approver_ids.filter(id => id !== approverId);
    } else {
      step.approver_ids = [...step.approver_ids, approverId];
    }
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a document",
      });
      return;
    }

    setLoading(true);
    try {
      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("approval_workflows")
        .insert({
          document_id: selectedDocument,
          workflow_type: workflowType,
          total_steps: steps.length,
          status: "draft",
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create approval steps and notifications
      for (const step of steps) {
        if (step.approver_ids.length === 0) {
          toast({
            variant: "destructive",
            title: "Error",
            description: `Step ${step.step_number} must have at least one approver`,
          });
          setLoading(false);
          return;
        }

        // Create a step for each approver (or one step with multiple approvers)
        // We'll create one step per approver for simplicity
        for (const approverId of step.approver_ids) {
          const { data: approvalStep, error: stepError } = await supabase
            .from("approval_steps")
            .insert({
              workflow_id: workflow.id,
              step_number: step.step_number,
              approver_id: approverId,
              status: "pending",
            })
            .select()
            .single();

          if (stepError) throw stepError;

          // Create notification record
          await supabase.from("approval_notifications").insert({
            approval_step_id: approvalStep.id,
            approver_id: approverId,
            email_sent: false,
          });

          // Send email notification (via Edge Function)
          try {
            const { error: emailError } = await supabase.functions.invoke("send-email", {
              body: {
                to: profiles.find(p => p.id === approverId)?.email,
                subject: `Approval Request: ${documents.find(d => d.id === selectedDocument)?.title}`,
                html: `
                  <h2>Approval Request</h2>
                  <p>You have been requested to approve a document in the workflow.</p>
                  <p><strong>Document:</strong> ${documents.find(d => d.id === selectedDocument)?.title}</p>
                  <p><strong>Step:</strong> ${step.step_number}</p>
                  <p>Please review and approve the document in the system.</p>
                `,
              },
            });

            if (!emailError) {
              await supabase
                .from("approval_notifications")
                .update({ email_sent: true, email_sent_at: new Date().toISOString() })
                .eq("approval_step_id", approvalStep.id)
                .eq("approver_id", approverId);
            }
          } catch (emailErr) {
            console.error("Failed to send email:", emailErr);
            // Don't fail the workflow creation if email fails
          }
        }
      }

      toast({
        title: "Workflow created successfully",
      });

      setSelectedDocument("");
      setWorkflowType("standard");
      setSteps([{ step_number: 1, approver_ids: [] }]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create workflow",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Approval Workflow</DialogTitle>
          <DialogDescription>
            Create a new approval workflow for a document
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document">Document *</Label>
            <Select value={selectedDocument} onValueChange={setSelectedDocument}>
              <SelectTrigger id="document">
                <SelectValue placeholder="Select a document" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow_type">Workflow Type *</Label>
            <Select value={workflowType} onValueChange={setWorkflowType}>
              <SelectTrigger id="workflow_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eso_qualification">ESO Qualification</SelectItem>
                <SelectItem value="business_plan_video">Business Plan Video</SelectItem>
                <SelectItem value="technical_report">Technical Report</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Approval Steps</Label>
              <Button type="button" size="sm" variant="outline" onClick={addStep}>
                Add Step
              </Button>
            </div>
            {steps.map((step, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Step {step.step_number} - Select Approvers:</span>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(index)}
                    >
                      Remove Step
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`step-${index}-approver-${profile.id}`}
                        checked={step.approver_ids.includes(profile.id)}
                        onChange={() => toggleApprover(index, profile.id)}
                        className="rounded"
                      />
                      <label
                        htmlFor={`step-${index}-approver-${profile.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {profile.full_name} ({profile.email})
                      </label>
                    </div>
                  ))}
                </div>
                {step.approver_ids.length === 0 && (
                  <p className="text-xs text-muted-foreground">Select at least one approver</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Workflow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowDialog;

