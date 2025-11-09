import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, CheckCircle, AlertCircle, Clock, Download, ThumbsUp, ThumbsDown, Search, Eye, History, AlertTriangle, Euro, Trash2, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobileGestures } from "@/hooks/useMobileGestures";
import { DocumentCardSkeleton } from "@/components/LoadingSkeletons";
import { DocumentDialog } from "@/components/DocumentDialog";
import { EnhancedFilePreview } from "@/components/EnhancedFilePreview";
import { CommentsSection } from "@/components/CommentsSection";
import { DocumentVersionHistory } from "@/components/DocumentVersionHistory";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteDocument } from "@/hooks/useDocuments";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { exportToCSV } from "@/utils/export";
import { BulkOperations } from "@/components/BulkOperations";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from "@/hooks/useDebounce";
import { highlightSearchTerm } from "@/utils/searchHighlight";
import { formatDistanceToNow, format } from "date-fns";

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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string } | null>(null);
  const [selectedDocumentForDetails, setSelectedDocumentForDetails] = useState<Document | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();
  const navigate = useNavigate();
  const deleteDocument = useDeleteDocument();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Memoize filtered documents for performance - must be before usePagination
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Search filter (using debounced query)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          (doc.description && doc.description.toLowerCase().includes(query))
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

    return filtered;
  }, [documents, debouncedSearchQuery, typeFilter, statusFilter]);
  
  const {
    paginatedData: paginatedDocuments,
    currentPage,
    totalPages,
    goToPage,
  } = usePagination(filteredDocuments, itemsPerPage);

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

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const docs = (data || []).map((doc: any) => ({
        ...doc,
        version: doc.version || 1, // Ensure version defaults to 1
        penalty_amount: doc.penalty_amount && doc.penalty_amount !== "00" ? Number(doc.penalty_amount) : null,
        late_submission_days: doc.late_submission_days && doc.late_submission_days !== "00" ? Number(doc.late_submission_days) : null,
        fsg_submission_id: doc.fsg_submission_id && doc.fsg_submission_id !== "00" ? doc.fsg_submission_id : null,
      }));
      setDocuments(docs);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
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

  // Helper function to extract filename with extension from URL
  const extractFileNameFromUrl = (url: string, fallbackTitle: string): string => {
    try {
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          return decodeURIComponent(lastPart.split('?')[0]);
        }
      } else {
        // Direct path
        const pathParts = url.split('/').filter(p => p);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          return lastPart;
        }
      }
    } catch (e) {
      // Fallback: try simple extraction
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return decodeURIComponent(lastPart.split('?')[0]);
      }
    }
    // If no extension found, add .pdf as default (most common)
    return fallbackTitle.includes('.') ? fallbackTitle : `${fallbackTitle}.pdf`;
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
      let fileData: Blob | null = null;
      let fileName = extractFileNameFromUrl(doc.file_url, doc.title);

      // Try to extract file path from URL
      let filePath = doc.file_url;
      if (doc.file_url.startsWith('http')) {
        try {
          const url = new URL(doc.file_url);
          const pathParts = url.pathname.split('/').filter(p => p);
          
          // Find the bucket index
          const bucketIndex = pathParts.findIndex(part => part === 'documents');
          if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
            // Get everything after 'documents'
            filePath = pathParts.slice(bucketIndex + 1).join('/');
          } else {
            // Try to get last two parts (user_id/filename)
            filePath = pathParts.slice(-2).join('/');
          }
        } catch (e) {
          // If URL parsing fails, try to extract from pathname
          const pathParts = doc.file_url.split('/').filter(p => p);
          const bucketIndex = pathParts.findIndex(part => part === 'documents');
          if (bucketIndex >= 0) {
            filePath = pathParts.slice(bucketIndex + 1).join('/');
          } else {
            filePath = pathParts.slice(-2).join('/');
          }
        }

        // Try to download from storage
        const { data, error: downloadError } = await supabase.storage
          .from('documents')
          .download(filePath);

        if (!downloadError && data) {
          fileData = data;
        } else {
          // If download fails, try fetching directly from the public URL
          const response = await fetch(doc.file_url);
          if (response.ok) {
            fileData = await response.blob();
            // Try to extract filename from Content-Disposition header or URL
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
              if (filenameMatch) {
                fileName = filenameMatch[1].replace(/['"]/g, '');
              }
            }
            // If still no extension, use extracted filename from URL
            if (!fileName.includes('.')) {
              fileName = extractFileNameFromUrl(doc.file_url, doc.title);
            }
          } else {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
        }
      } else {
        // Direct path, try to download
        const { data, error: downloadError } = await supabase.storage
          .from('documents')
          .download(filePath);

        if (downloadError) throw downloadError;
        fileData = data;
      }

      if (!fileData) {
        throw new Error("Failed to retrieve file data");
      }

      // Ensure filename has extension
      if (!fileName.includes('.')) {
        fileName = `${fileName}.pdf`; // Default to PDF if no extension
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(fileData);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: "Document downloaded successfully" });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message || "Failed to download file. Please check the file URL.",
      });
    }
  };

  const handleDeleteClick = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync(documentToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      fetchDocuments();
    }
  };

  const handleExport = () => {
    const csvData = filteredDocuments.map((doc) => ({
      Title: doc.title,
      Description: doc.description || "",
      Type: getDocumentTypeLabel(doc.document_type),
      Version: doc.version,
      Status: doc.is_approved ? "Approved" : doc.submitted_at ? "Pending" : "Draft",
      "Submission Deadline": doc.submission_deadline ? format(new Date(doc.submission_deadline), "PP") : "",
      "Submitted At": doc.submitted_at ? format(new Date(doc.submitted_at), "PP") : "",
      "Created At": format(new Date(doc.created_at), "PP"),
    }));

    exportToCSV(csvData, `documents-${new Date().toISOString().split("T")[0]}`, [
      "Title",
      "Description",
      "Type",
      "Version",
      "Status",
      "Submission Deadline",
      "Submitted At",
      "Created At",
    ]);
  };

  const handleBulkAction = async (action: string, documentIds: string[]) => {
    try {
      if (action === "approve") {
        const { error } = await supabase
          .from("documents")
          .update({ is_approved: true })
          .in("id", documentIds);
        if (error) throw error;
        toast({ title: `${documentIds.length} document(s) approved` });
      } else if (action === "delete") {
        setBulkDeleteDialogOpen(true);
        return; // Will be handled by confirmation dialog
      } else if (action === "reject") {
        const { error } = await supabase
          .from("documents")
          .update({ is_approved: false, submitted_at: null })
          .in("id", documentIds);
        if (error) throw error;
        toast({ title: `${documentIds.length} document(s) rejected` });
      }
      fetchDocuments();
      setSelectedDocuments([]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      for (const id of selectedDocuments) {
        await deleteDocument.mutateAsync(id);
      }
      setBulkDeleteDialogOpen(false);
      setSelectedDocuments([]);
      fetchDocuments();
    } catch (error) {
      // Error already handled by deleteDocument mutation
    }
  };

  // Mobile gestures for navigation
  const swipeHandlers = useMobileGestures();

  return (
    <DashboardLayout>
      <div {...swipeHandlers} className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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

        {/* Bulk Operations */}
        {filteredDocuments.length > 0 && (
          <BulkOperations
            items={filteredDocuments}
            selectedItems={selectedDocuments}
            onSelectionChange={setSelectedDocuments}
            onBulkAction={handleBulkAction}
            availableActions={[
              { label: "Approve", value: "approve" },
              { label: "Reject", value: "reject" },
              { label: "Delete", value: "delete", variant: "destructive" },
            ]}
          />
        )}

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
          <EnhancedFilePreview
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            fileUrl={previewFile.url}
            fileName={previewFile.name}
          />
        )}
        
        {selectedDocumentForDetails && (
          <>
            <Dialog open={showComments} onOpenChange={setShowComments}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Comments - {selectedDocumentForDetails.title}</DialogTitle>
                </DialogHeader>
                <CommentsSection entityType="document" entityId={selectedDocumentForDetails.id} />
              </DialogContent>
            </Dialog>
            
            <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Version History - {selectedDocumentForDetails.title}</DialogTitle>
                </DialogHeader>
                <DocumentVersionHistory 
                  documentId={selectedDocumentForDetails.id}
                  currentVersion={selectedDocumentForDetails.version || 1}
                />
              </DialogContent>
            </Dialog>
          </>
        )}

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Document"
          description="Are you sure you want to delete this document? The file will also be removed from storage."
          itemName={documentToDelete?.title}
          isLoading={deleteDocument.isPending}
        />

        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <DocumentCardSkeleton key={i} />
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
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedDocuments.map((doc) => (
                <Card 
                  key={doc.id} 
                  className={`hover:shadow-md transition-shadow ${
                    selectedDocuments.includes(doc.id) ? "ring-2 ring-primary" : ""
                  }`}
                >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDocuments([...selectedDocuments, doc.id]);
                          } else {
                            setSelectedDocuments(selectedDocuments.filter((id) => id !== doc.id));
                          }
                        }}
                        className="mt-1"
                      />
                      {getStatusIcon(doc)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg line-clamp-2">
                          {debouncedSearchQuery ? highlightSearchTerm(doc.title, debouncedSearchQuery) : doc.title}
                        </CardTitle>
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
                        Due: {format(new Date(doc.submission_deadline), "PP")}
                        {doc.submission_deadline && new Date(doc.submission_deadline) < new Date() && !doc.submitted_at && (
                          <span className="ml-2">⚠️ Overdue</span>
                        )}
                      </span>
                    </div>
                  )}
                  {doc.submitted_at && (
                    <div className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(doc.submitted_at), "PP")}
                    </div>
                  )}
                  {doc.penalty_amount && typeof doc.penalty_amount === 'number' && doc.penalty_amount > 0 && (
                    <div className="flex items-center text-sm text-red-600">
                      <Euro className="mr-2 h-4 w-4" />
                      <span>Penalty: €{doc.penalty_amount.toLocaleString()}</span>
                      {doc.penalty_reason && (
                        <span className="ml-2 text-xs">({doc.penalty_reason})</span>
                      )}
                    </div>
                  )}
                  {doc.late_submission_days && typeof doc.late_submission_days === 'number' && doc.late_submission_days > 0 && (
                    <div className="text-xs text-orange-600">
                      Late by {doc.late_submission_days} day{doc.late_submission_days > 1 ? 's' : ''}
                    </div>
                  )}
                  {doc.fsg_submission_id && doc.fsg_submission_id !== "00" && doc.fsg_submission_id.trim() !== "" && (
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
                            // Extract filename with extension from URL for proper preview
                            const extractFileName = (url: string, fallback: string): string => {
                              try {
                                if (url.startsWith('http')) {
                                  const urlObj = new URL(url);
                                  const pathParts = urlObj.pathname.split('/').filter(p => p);
                                  const lastPart = pathParts[pathParts.length - 1];
                                  if (lastPart && lastPart.includes('.')) {
                                    return decodeURIComponent(lastPart.split('?')[0]);
                                  }
                                } else {
                                  const pathParts = url.split('/').filter(p => p);
                                  const lastPart = pathParts[pathParts.length - 1];
                                  if (lastPart && lastPart.includes('.')) {
                                    return lastPart;
                                  }
                                }
                              } catch (e) {
                                const parts = url.split('/');
                                const lastPart = parts[parts.length - 1];
                                if (lastPart && lastPart.includes('.')) {
                                  return decodeURIComponent(lastPart.split('?')[0]);
                                }
                              }
                              return fallback;
                            };
                            const fileNameWithExt = extractFileName(doc.file_url, doc.title);
                            setPreviewFile({ url: doc.file_url, name: fileNameWithExt });
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
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="touch-target text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocumentForDetails(doc);
                            setShowComments(true);
                          }}
                          title="Comments"
                        >
                          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Comments</span>
                          <span className="sm:hidden">Cmt</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="touch-target text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocumentForDetails(doc);
                            setShowVersionHistory(true);
                          }}
                          title="Version History"
                        >
                          <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Versions</span>
                          <span className="sm:hidden">Ver</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="touch-target text-xs sm:text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(doc, e)}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">Del</span>
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
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filteredDocuments.length}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;
