import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type Document = {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  version: number;
  submission_deadline: string | null;
  submitted_at: string | null;
  is_approved: boolean;
  created_at: string;
};

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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

  const { isLeadership } = useUserRole(user?.id);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Repository</h1>
            <p className="text-muted-foreground">Manage Formula IHU compliance documents</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No documents yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first compliance document to get started
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
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
