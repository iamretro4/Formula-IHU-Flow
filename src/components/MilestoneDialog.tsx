import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type MilestoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: any;
  onSuccess: () => void;
};

export function MilestoneDialog({ open, onOpenChange, projectId, milestone, onSuccess }: MilestoneDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && milestone) {
      setFormData({
        title: milestone.title || "",
        description: milestone.description || "",
        due_date: milestone.due_date ? new Date(milestone.due_date).toISOString().split('T')[0] : "",
      });
    } else if (open && !milestone) {
      setFormData({
        title: "",
        description: "",
        due_date: "",
      });
    }
  }, [open, milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const milestoneData = {
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date,
        project_id: projectId,
      };

      if (milestone) {
        const { error } = await supabase
          .from("milestones")
          .update(milestoneData)
          .eq("id", milestone.id);
        if (error) throw error;
        toast({ title: "Milestone updated successfully" });
      } else {
        const { error } = await supabase
          .from("milestones")
          .insert([milestoneData]);
        if (error) throw error;
        toast({ title: "Milestone created successfully" });
      }

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
          <DialogDescription>
            {milestone ? "Update milestone details" : "Add a new milestone to track progress"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Milestone Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Complete chassis design"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Milestone details and requirements"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : milestone ? "Update Milestone" : "Add Milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
