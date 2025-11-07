import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const IncomeDialog = ({ open, onOpenChange, onSuccess }: IncomeDialogProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    source: "sponsorship",
    description: "",
    amount: "",
    received_date: new Date().toISOString().split('T')[0],
    received_from: "",
    project_id: "",
    budget_id: "",
    is_confirmed: true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [projectsRes, budgetsRes] = await Promise.all([
        supabase.from("projects").select("id, name"),
        supabase.from("budgets").select("id, name"),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (budgetsRes.error) throw budgetsRes.error;

      setProjects(projectsRes.data || []);
      setBudgets(budgetsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load data",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const incomeData: any = {
        source: formData.source,
        amount: parseFloat(formData.amount),
        received_date: formData.received_date,
        is_confirmed: formData.is_confirmed,
        created_by: user.id,
      };

      if (formData.description) {
        incomeData.description = formData.description;
      }
      if (formData.received_from) {
        incomeData.received_from = formData.received_from;
      }
      if (formData.project_id) {
        incomeData.project_id = formData.project_id;
      }
      if (formData.budget_id) {
        incomeData.budget_id = formData.budget_id;
      }

      const { error } = await supabase.from("income").insert(incomeData);

      if (error) {
        console.error("Income creation error:", error);
        throw error;
      }

      toast({
        title: "Income recorded successfully",
      });

      setFormData({
        source: "sponsorship",
        description: "",
        amount: "",
        received_date: new Date().toISOString().split('T')[0],
        received_from: "",
        project_id: "",
        budget_id: "",
        is_confirmed: true,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating income:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record income",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Income</DialogTitle>
          <DialogDescription>Record a new income source</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Income Source *</Label>
              <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="university_funding">University Funding</SelectItem>
                  <SelectItem value="competition_prize">Competition Prize</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="fundraising">Fundraising</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="received_date">Received Date *</Label>
              <Input
                id="received_date"
                type="date"
                value={formData.received_date}
                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="received_from">Received From</Label>
              <Input
                id="received_from"
                value={formData.received_from}
                onChange={(e) => setFormData({ ...formData, received_from: e.target.value })}
                placeholder="e.g., Company Name, Sponsor Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Select value={formData.project_id || undefined} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger id="project_id">
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_id">Budget (Optional)</Label>
              <Select value={formData.budget_id || undefined} onValueChange={(value) => setFormData({ ...formData, budget_id: value })}>
                <SelectTrigger id="budget_id">
                  <SelectValue placeholder="Select a budget (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IncomeDialog;

