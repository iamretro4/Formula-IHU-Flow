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
import { FileUploadZone } from "@/components/FileUploadZone";

type DocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  document?: any;
};

export function DocumentDialog({ open, onOpenChange, onSuccess, document }: DocumentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
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
        
        setUploadProgress(0);
        
        // Simulate upload progress (Supabase doesn't provide progress events)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        file_url = publicUrl;
        setUploadProgress(0);
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
            <Label>Upload File</Label>
            <FileUploadZone
              onFileSelect={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
              maxSize={50 * 1024 * 1024}
              disabled={loading}
              currentFile={file}
              uploadProgress={uploadProgress}
              isUploading={loading && uploadProgress > 0}
            />
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
