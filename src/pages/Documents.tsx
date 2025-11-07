import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, CheckCircle, AlertCircle, Clock, Download, ThumbsUp, ThumbsDown, Search, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import { DocumentDialog } from "@/components/DocumentDialog";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";

type Document = {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  version: number;
  submission_deadline: string | null;
  submitted_at: string | null;
  is_approved: boolean;
  file_url: string | null;
  created_at: string;
};

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string } | null>(null);
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

  const { isLeadership, isDirector } = useUserRole(user?.id);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  useEffect(() => {
    let filtered = documents;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((doc) => doc.document_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "approved") {
        filtered = filtered.filter((doc) => doc.is_approved);
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((doc) => doc.submitted_at && !doc.is_approved);
      } else if (statusFilter === "draft") {
        filtered = filtered.filter((doc) => !doc.submitted_at);
      }
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, typeFilter, statusFilter]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const docs = data || [];
      setDocuments(docs);
      setFilteredDocuments(docs);
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

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      design_spec: "Design Specification",
      engineering_report: "Engineering Report",
      cost_report: "Cost Report",
      status_video: "Status Video",
      business_plan: "Business Plan",
      safety_doc: "Safety Document",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getStatusIcon = (doc: Document) => {
    if (doc.is_approved) {
      return <CheckCircle className="h-5 w-5 text-success" />;
    }
    if (doc.submitted_at) {
      return <Clock className="h-5 w-5 text-warning" />;
    }
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (doc: Document) => {
    if (doc.is_approved) {
      return <Badge className="bg-success/20 text-success-foreground">Approved</Badge>;
    }
    if (doc.submitted_at) {
      return <Badge className="bg-warning/20 text-warning-foreground">Under Review</Badge>;
    }
    if (doc.submission_deadline) {
      const deadline = new Date(doc.submission_deadline);
      const today = new Date();
      if (deadline < today) {
        return <Badge className="bg-destructive/20 text-destructive-foreground">Overdue</Badge>;
      }
    }
    return <Badge className="bg-muted text-muted-foreground">Draft</Badge>;
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ 
          is_approved: true,
          approved_by: user?.id,
        })
        .eq("id", docId);

      if (error) throw error;

      toast({ title: "Document approved successfully" });
      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (!doc.file_url) {
      toast({
        variant: "destructive",
        title: "No file available",
        description: "This document doesn't have an attached file",
      });
      return;
    }

    try {
      // Extract file path from URL
      const url = new URL(doc.file_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/');

      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const blob = new Blob([data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: "Document downloaded successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Repository</h1>
            <p className="text-muted-foreground">Manage Formula IHU compliance documents</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="design_spec">Design Specification</SelectItem>
              <SelectItem value="engineering_report">Engineering Report</SelectItem>
              <SelectItem value="cost_report">Cost Report</SelectItem>
              <SelectItem value="status_video">Status Video</SelectItem>
              <SelectItem value="business_plan">Business Plan</SelectItem>
              <SelectItem value="safety_doc">Safety Document</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DocumentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={fetchDocuments}
        />

        {previewFile && (
          <FilePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            fileUrl={previewFile.url}
            fileName={previewFile.name}
          />
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No documents yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first compliance document to get started
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No documents found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Upload your first compliance document to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(doc)}
                      <div className="flex-1">
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {getDocumentTypeLabel(doc.document_type)} v{doc.version}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(doc)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                  {doc.submission_deadline && (
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Due: {new Date(doc.submission_deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {doc.submitted_at && (
                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(doc.submitted_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    {doc.file_url && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setPreviewFile({ url: doc.file_url, name: doc.title });
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownloadDocument(doc)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </>
                    )}
                    {isDirector && doc.submitted_at && !doc.is_approved && (
                      <Button 
                        size="sm"
                        onClick={() => handleApproveDocument(doc.id)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;
