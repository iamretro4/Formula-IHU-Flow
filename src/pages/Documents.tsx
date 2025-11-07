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
import { Plus, FileText, Calendar, CheckCircle, AlertCircle, Clock, Download, ThumbsUp, ThumbsDown, Search, Eye, History, AlertTriangle, Euro } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  parent_version_id?: string | null;
  change_log?: string | null;
  fsg_submission_id?: string | null;
  fsg_submitted_at?: string | null;
  penalty_amount?: number | null;
  penalty_reason?: string | null;
  late_submission_days?: number | null;
};

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | undefined>(undefined);
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

  // All users are admins - no role checks needed

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
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Document Repository</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage Formula IHU compliance documents</p>
          </div>
          <Button onClick={() => { 
            setSelectedDocument(undefined); 
            setDialogOpen(true); 
          }} className="touch-target w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px] touch-target">
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
            <SelectTrigger className="w-full sm:w-[180px] touch-target">
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
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedDocument(undefined);
          }}
          onSuccess={fetchDocuments}
          document={selectedDocument}
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                      {getStatusIcon(doc)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{doc.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {getDocumentTypeLabel(doc.document_type)} v{doc.version}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(doc)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {doc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                  {doc.submission_deadline && (
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className={`${
                        doc.submission_deadline && new Date(doc.submission_deadline) < new Date() && !doc.submitted_at
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground"
                      }`}>
                        Due: {new Date(doc.submission_deadline).toLocaleDateString()}
                        {doc.submission_deadline && new Date(doc.submission_deadline) < new Date() && !doc.submitted_at && (
                          <span className="ml-2">⚠️ Overdue</span>
                        )}
                      </span>
                    </div>
                  )}
                  {doc.submitted_at && (
                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(doc.submitted_at).toLocaleDateString()}
                    </div>
                  )}
                  {doc.penalty_amount && doc.penalty_amount > 0 && (
                    <div className="flex items-center text-sm text-red-600">
                      <Euro className="mr-2 h-4 w-4" />
                      <span>Penalty: €{doc.penalty_amount.toLocaleString()}</span>
                      {doc.penalty_reason && (
                        <span className="ml-2 text-xs">({doc.penalty_reason})</span>
                      )}
                    </div>
                  )}
                  {doc.late_submission_days && doc.late_submission_days > 0 && (
                    <div className="text-xs text-orange-600">
                      Late by {doc.late_submission_days} day{doc.late_submission_days > 1 ? 's' : ''}
                    </div>
                  )}
                  {doc.fsg_submission_id && (
                    <div className="text-xs text-muted-foreground">
                      FSG ID: {doc.fsg_submission_id}
                    </div>
                  )}
                  {doc.parent_version_id && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <History className="mr-1 h-3 w-3" />
                      <span>Version {doc.version} (has previous versions)</span>
                    </div>
                  )}
                  {doc.change_log && (
                    <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                      <strong>Changes:</strong> {doc.change_log}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="touch-target text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocument(doc);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    {doc.file_url && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="touch-target text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile({ url: doc.file_url, name: doc.title });
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Preview</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="touch-target text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDocument(doc);
                          }}
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">DL</span>
                        </Button>
                      </>
                    )}
                    {doc.submitted_at && !doc.is_approved && (
                      <Button 
                        size="sm"
                        className="touch-target text-xs sm:text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveDocument(doc.id);
                        }}
                      >
                        <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
