import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { Upload, FileText } from "lucide-react";

type DocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  document?: any;
};

export function DocumentDialog({ open, onOpenChange, onSuccess, document }: DocumentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    document_type: "engineering_report",
    submission_deadline: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && document) {
      setFormData({
        title: document.title || "",
        description: document.description || "",
        document_type: document.document_type || "engineering_report",
        submission_deadline: document.submission_deadline 
          ? new Date(document.submission_deadline).toISOString().split('T')[0] 
          : "",
      });
      setFile(null);
    } else if (!open) {
      setFormData({
        title: "",
        description: "",
        document_type: "engineering_report",
        submission_deadline: "",
      });
      setFile(null);
    }
  }, [open, document]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (selectedFile.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `File size must be less than 50MB. Current size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`,
        });
        e.target.value = ""; // Reset input
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload PDF, Word, Excel, PowerPoint, Image, or Text files only.",
        });
        e.target.value = ""; // Reset input
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let file_url = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        file_url = publicUrl;
      }

      const docData: Database["public"]["Tables"]["documents"]["Insert"] = {
        title: formData.title,
        description: formData.description || null,
        document_type: formData.document_type as Database["public"]["Enums"]["document_type"],
        uploaded_by: user.id,
        submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : null,
      };

      if (document) {
        // Update existing document
        const { error } = await supabase
          .from("documents")
          .update({
            ...docData,
            file_url: file_url || document.file_url, // Keep existing file if no new file uploaded
            version: document.version + 1,
            parent_version_id: document.id,
          })
          .eq("id", document.id);

        if (error) throw error;
        toast({ title: "Document updated successfully" });
      } else {
        // Create new document
        const { error } = await supabase
          .from("documents")
          .insert([docData]);

        if (error) throw error;
        toast({ title: "Document uploaded successfully" });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? "Edit Document" : "Upload Document"}</DialogTitle>
          <DialogDescription>
            {document ? "Update document details" : "Add a new compliance document to the repository"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
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
              <Label htmlFor="document_type">Document Type *</Label>
              <Select value={formData.document_type} onValueChange={(value) => setFormData({ ...formData, document_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design_spec">Design Specification</SelectItem>
                  <SelectItem value="engineering_report">Engineering Report</SelectItem>
                  <SelectItem value="cost_report">Cost Report</SelectItem>
                  <SelectItem value="status_video">Status Video</SelectItem>
                  <SelectItem value="business_plan">Business Plan</SelectItem>
                  <SelectItem value="safety_doc">Safety Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission_deadline">Submission Deadline</Label>
              <Input
                id="submission_deadline"
                type="date"
                value={formData.submission_deadline}
                onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload File</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
              />
              <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                {file ? (
                  <>
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, XLS, PPT, JPG, PNG, TXT (Max 50MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (document ? "Updating..." : "Uploading...") : (document ? "Update Document" : "Upload Document")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
