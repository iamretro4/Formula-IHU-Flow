import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Download, RotateCcw, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentVersion = {
  id: string;
  title: string;
  version: number;
  parent_version_id: string | null;
  file_url: string | null;
  uploaded_by: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
  };
};

type DocumentVersionHistoryProps = {
  documentId: string;
  currentVersion: number;
  onRestoreSuccess?: () => void;
};

export function DocumentVersionHistory({ documentId, currentVersion, onRestoreSuccess }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchVersions();
  }, [documentId]);

  const fetchVersions = async () => {
    try {
      // Get all versions of this document (including current)
      const { data: currentDoc } = await supabase
        .from("documents")
        .select("*, uploaded_by_profile:profiles(id, full_name)")
        .eq("id", documentId)
        .single();

      if (!currentDoc) return;

      // Get parent versions
      const versionChain: DocumentVersion[] = [];
      let current: any = currentDoc;

      while (current) {
        versionChain.unshift({
          id: current.id,
          title: current.title,
          version: current.version || 1,
          parent_version_id: current.parent_version_id,
          file_url: current.file_url,
          uploaded_by: current.uploaded_by,
          created_at: current.created_at,
          user: current.uploaded_by_profile,
        });

        if (current.parent_version_id) {
          const { data: parent } = await supabase
            .from("documents")
            .select("*, uploaded_by_profile:profiles(id, full_name)")
            .eq("id", current.parent_version_id)
            .single();
          current = parent;
        } else {
          current = null;
        }
      }

      setVersions(versionChain);
    } catch (error: any) {
      console.error("Error fetching versions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      const version = versions.find((v) => v.id === versionId);
      if (!version) return;

      // Create a new version based on the selected one
      const { data: versionDoc } = await supabase
        .from("documents")
        .select("*")
        .eq("id", versionId)
        .single();

      if (!versionDoc) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("documents").insert({
        title: versionDoc.title,
        description: versionDoc.description,
        document_type: versionDoc.document_type,
        file_url: versionDoc.file_url,
        uploaded_by: user.id,
        parent_version_id: documentId,
        version: (currentVersion || 0) + 1,
      });

      if (error) throw error;

      toast({ title: "Version restored successfully" });
      fetchVersions();
      onRestoreSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading version history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {versions.map((version, idx) => (
              <div
                key={version.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  version.version === currentVersion ? "bg-primary/5 border-primary" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Version {version.version}</span>
                    {version.version === currentVersion && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {version.user?.full_name || "Unknown"} • {format(new Date(version.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {version.file_url && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(version.file_url!, "_blank")}
                        title="Preview version"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            // Extract file path from URL
                            let filePath = version.file_url!;
                            if (version.file_url!.startsWith('http')) {
                              try {
                                const url = new URL(version.file_url!);
                                const pathParts = url.pathname.split('/').filter(p => p);
                                const bucketIndex = pathParts.findIndex(part => part === 'documents');
                                if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
                                  filePath = pathParts.slice(bucketIndex + 1).join('/');
                                } else {
                                  filePath = pathParts.slice(-2).join('/');
                                }
                              } catch (e) {
                                const pathParts = version.file_url!.split('/').filter(p => p);
                                const bucketIndex = pathParts.findIndex(part => part === 'documents');
                                if (bucketIndex >= 0) {
                                  filePath = pathParts.slice(bucketIndex + 1).join('/');
                                } else {
                                  filePath = pathParts.slice(-2).join('/');
                                }
                              }
                            }

                            // Try to download from storage
                            const { data, error: downloadError } = await supabase.storage
                              .from('documents')
                              .download(filePath);

                            let fileData: Blob | null = null;
                            let fileName = `${version.title}_v${version.version}`;

                            if (!downloadError && data) {
                              fileData = data;
                            } else {
                              // Fallback to fetch
                              const response = await fetch(version.file_url!);
                              if (response.ok) {
                                fileData = await response.blob();
                                const urlParts = version.file_url!.split('/');
                                const urlFileName = urlParts[urlParts.length - 1];
                                if (urlFileName && urlFileName.includes('.')) {
                                  fileName = decodeURIComponent(urlFileName.split('?')[0]);
                                }
                              } else {
                                throw new Error(`Failed to fetch file: ${response.statusText}`);
                              }
                            }

                            if (!fileData) {
                              throw new Error("Failed to retrieve file data");
                            }

                            // Ensure filename has extension
                            if (!fileName.includes('.')) {
                              const urlParts = version.file_url!.split('/');
                              const lastPart = urlParts[urlParts.length - 1];
                              if (lastPart && lastPart.includes('.')) {
                                fileName = decodeURIComponent(lastPart.split('?')[0]);
                              } else {
                                fileName = `${fileName}.pdf`;
                              }
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

                            toast({ title: "Version downloaded successfully" });
                          } catch (error: any) {
                            console.error("Download error:", error);
                            toast({
                              variant: "destructive",
                              title: "Download failed",
                              description: error.message || "Failed to download version file.",
                            });
                          }
                        }}
                        title="Download this version"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {version.version !== currentVersion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRestore(version.id)}
                      title="Restore this version"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

