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

interface PurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PurchaseRequestDialog = ({ open, onOpenChange, onSuccess }: PurchaseRequestDialogProps) => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    category: "materials",
    vendor: "",
    justification: "",
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
        console.error("Error in PurchaseRequestDialog useEffect:", error);
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

      const purchaseData: any = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        requested_by: user.id,
        approval_threshold: parseFloat(formData.amount),
      };

      if (formData.description) {
        purchaseData.description = formData.description;
      }
      if (formData.vendor) {
        purchaseData.vendor = formData.vendor;
      }
      if (formData.justification) {
        purchaseData.justification = formData.justification;
      }
      if (formData.budget_id) {
        purchaseData.budget_id = formData.budget_id;
      }
      if (formData.project_id) {
        purchaseData.project_id = formData.project_id;
      }

      const { error } = await supabase.from("purchase_requests").insert(purchaseData);

      if (error) {
        console.error("Purchase request creation error:", error);
        throw error;
      }

      toast({
        title: "Purchase request created successfully",
      });

      setFormData({
        title: "",
        description: "",
        amount: "",
        category: "materials",
        vendor: "",
        justification: "",
        budget_id: "",
        project_id: "",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating purchase request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create purchase request",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Request</DialogTitle>
          <DialogDescription>Request approval for a purchase</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justification</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              rows={3}
              placeholder="Explain why this purchase is needed..."
            />
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
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseRequestDialog;

