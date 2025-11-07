import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type FilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string;
};

export function FilePreviewDialog({ open, onOpenChange, fileUrl, fileName }: FilePreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fileUrl) {
      loadPreview();
    } else {
      setPreviewUrl(null);
      setFileType("");
      setError(null);
    }
  }, [open, fileUrl]);

  const loadPreview = async () => {
    if (!fileUrl) return;
    
    setLoading(true);
    setError(null);

    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/');

      // Get file from storage
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      // Determine file type
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
      const isPdf = extension === 'pdf';
      const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension);
      const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(extension);
      const isText = ['txt', 'md', 'csv', 'json', 'xml', 'log'].includes(extension);

      if (isImage || isPdf || isVideo || isAudio || isText) {
        const blob = new Blob([data]);
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
        if (isImage) setFileType('image');
        else if (isPdf) setFileType('pdf');
        else if (isVideo) setFileType('video');
        else if (isAudio) setFileType('audio');
        else if (isText) {
          setFileType('text');
          // Load text content
          const text = await data.text();
          setTextContent(text);
        }
      } else {
        setError("Preview not available for this file type. Please download to view.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileUrl) return;

    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/');

      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const blob = new Blob([data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error("Download failed:", err);
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{fileName}</DialogTitle>
            <div className="flex gap-2">
              {fileUrl && (
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                {fileUrl && (
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                )}
              </div>
            </div>
          ) : previewUrl && fileType === 'image' ? (
            <div className="flex items-center justify-center">
              <img 
                src={previewUrl} 
                alt={fileName}
                className="max-w-full max-h-[calc(90vh-200px)] object-contain rounded-lg"
              />
            </div>
          ) : previewUrl && fileType === 'pdf' ? (
            <div className="w-full h-[calc(90vh-200px)]">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 rounded-lg"
                title={fileName}
              />
            </div>
          ) : previewUrl && fileType === 'video' ? (
            <div className="flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[calc(90vh-200px)] rounded-lg"
              >
                Your browser does not support video playback.
              </video>
            </div>
          ) : previewUrl && fileType === 'audio' ? (
            <div className="flex items-center justify-center h-96">
              <audio src={previewUrl} controls className="w-full max-w-md" />
            </div>
          ) : previewUrl && fileType === 'text' ? (
            <div className="w-full h-[calc(90vh-200px)] overflow-auto">
              <pre className="p-4 bg-muted rounded-lg text-sm font-mono whitespace-pre-wrap">
                {textContent || 'Loading text content...'}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Preview not available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

