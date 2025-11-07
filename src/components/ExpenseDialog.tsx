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

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ExpenseDialog = ({ open, onOpenChange, onSuccess }: ExpenseDialogProps) => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    category: "materials",
    amount: "",
    expense_date: new Date().toISOString().split('T')[0],
    vendor: "",
    budget_id: "",
    project_id: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      try {
        fetchData();
      } catch (error) {
        console.error("Error in ExpenseDialog useEffect:", error);
      }
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [budgetsRes, projectsRes] = await Promise.all([
        supabase.from("budgets").select("id, name"),
        supabase.from("projects").select("id, name"),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setBudgets(budgetsRes.data || []);
      setProjects(projectsRes.data || []);
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

      const expenseData: any = {
        description: formData.description,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        created_by: user.id,
      };

      if (formData.vendor) {
        expenseData.vendor = formData.vendor;
      }
      if (formData.budget_id) {
        expenseData.budget_id = formData.budget_id;
      }
      if (formData.project_id) {
        expenseData.project_id = formData.project_id;
      }

      const { error } = await supabase.from("expenses").insert(expenseData);

      if (error) {
        console.error("Expense creation error:", error);
        throw error;
      }

      toast({
        title: "Expense created successfully",
      });

      setFormData({
        description: "",
        category: "materials",
        amount: "",
        expense_date: new Date().toISOString().split('T')[0],
        vendor: "",
        budget_id: "",
        project_id: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create expense",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Record a new expense</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="competition_fees">Competition Fees</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_date">Date *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDialog;

