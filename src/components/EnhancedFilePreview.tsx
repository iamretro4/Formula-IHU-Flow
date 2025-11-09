import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";
import "react-image-gallery/styles/css/image-gallery.css";
import ImageGallery from "react-image-gallery";
import ReactPlayer from "react-player";

// Configure PDF.js worker - use local worker from public folder
// This ensures the worker is always available and avoids CDN issues
// The worker file has been copied to public/pdf.worker.min.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type EnhancedFilePreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string;
};

type PreviewType = "pdf" | "image" | "video" | "audio" | "office" | "text" | "unsupported";

export function EnhancedFilePreview({ open, onOpenChange, fileUrl, fileName }: EnhancedFilePreviewProps) {
  const [previewType, setPreviewType] = useState<PreviewType>("unsupported");
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [textContent, setTextContent] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && fileUrl) {
      loadPreview();
    } else {
      resetPreview();
    }
  }, [open, fileUrl]);

  const resetPreview = () => {
    setPreviewType("unsupported");
    setPdfPages([]);
    setCurrentPage(1);
    setTotalPages(0);
    setScale(1.0);
    setRotation(0);
    setImageUrls([]);
    setTextContent("");
    setError(null);
  };

  const detectFileType = (fileName: string): PreviewType => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
    if (['txt', 'md', 'csv', 'json', 'xml', 'log', 'js', 'ts', 'tsx', 'jsx', 'css', 'html'].includes(extension)) return 'text';
    
    return 'unsupported';
  };

  const loadPreview = async () => {
    if (!fileUrl) return;
    
    setLoading(true);
    setError(null);

    try {
      const fileType = detectFileType(fileName);
      setPreviewType(fileType);

      // Extract file path from URL - handle both full URLs and storage paths
      let filePath = fileUrl;
      if (fileUrl.startsWith('http')) {
        try {
          const url = new URL(fileUrl);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'documents');
          if (bucketIndex >= 0) {
            filePath = pathParts.slice(bucketIndex + 1).join('/');
          } else {
            // Try alternative path structure
            filePath = pathParts.slice(-2).join('/'); // Last two parts (user_id/filename)
          }
        } catch (e) {
          // If URL parsing fails, try direct path
          filePath = fileUrl.split('/').slice(-2).join('/');
        }
      } else {
        // Already a path, use as is
        filePath = fileUrl;
      }

      // Try to get file from storage
      let fileData: Blob | null = null;
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (!downloadError && data) {
        fileData = data;
      } else {
        // If download fails, try fetching directly from the public URL
        if (fileUrl.startsWith('http')) {
          try {
            const response = await fetch(fileUrl);
            if (response.ok) {
              fileData = await response.blob();
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (fetchError: any) {
            throw new Error(`Failed to load file: ${fetchError.message || downloadError?.message || 'Unknown error'}`);
          }
        } else {
          throw new Error(`Failed to load file: ${downloadError?.message || 'File not found'}`);
        }
      }

      if (!fileData) {
        throw new Error("Failed to retrieve file data");
      }

      if (fileType === 'pdf') {
        await loadPdf(fileData);
      } else if (fileType === 'image') {
        // For images, always use the public URL if available (better for CORS and caching)
        // Only use blob URL if we can't use the public URL
        if (fileUrl.startsWith('http')) {
          // Test if the URL is accessible
          try {
            const testResponse = await fetch(fileUrl, { method: 'HEAD' });
            if (testResponse.ok) {
              setImageUrls([fileUrl]);
            } else {
              // If HEAD fails, try blob URL
              const blobUrl = window.URL.createObjectURL(fileData);
              setImageUrls([blobUrl]);
            }
          } catch (e) {
            // If fetch fails, use blob URL
            const blobUrl = window.URL.createObjectURL(fileData);
            setImageUrls([blobUrl]);
          }
        } else {
          const blobUrl = window.URL.createObjectURL(fileData);
          setImageUrls([blobUrl]);
        }
      } else if (fileType === 'video' || fileType === 'audio') {
        // For video/audio, use public URL if available, otherwise create blob URL
        if (fileUrl.startsWith('http')) {
          setImageUrls([fileUrl]);
        } else {
          const blobUrl = window.URL.createObjectURL(fileData);
          setImageUrls([blobUrl]);
        }
      } else if (fileType === 'text') {
        const text = await fileData.text();
        setTextContent(text);
      } else if (fileType === 'office') {
        setError("Office documents preview is not yet available. Please download to view.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const loadPdf = async (data: Blob) => {
    try {
      const arrayBuffer = await data.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);

      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        pages.push(page);
      }
      setPdfPages(pages);
      renderPdfPage(pages[0], 1);
    } catch (err: any) {
      throw new Error(`Failed to load PDF: ${err.message}`);
    }
  };

  const renderPdfPage = async (page: any, pageNum: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale, rotation });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
  };

  useEffect(() => {
    if (previewType === 'pdf' && pdfPages.length > 0) {
      renderPdfPage(pdfPages[currentPage - 1], currentPage);
    }
  }, [currentPage, scale, rotation, pdfPages]);

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
      console.error("Download error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate flex-1">{fileName}</DialogTitle>
            <div className="flex items-center gap-2">
              {previewType === 'pdf' && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                    disabled={scale <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setScale(Math.min(3, scale + 0.25))}
                    disabled={scale >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-destructive">
                <p>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {previewType === 'pdf' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center bg-gray-100 p-4 rounded-lg overflow-auto">
                    <canvas ref={canvasRef} className="border shadow-lg" />
                  </div>
                </div>
              )}

              {previewType === 'image' && imageUrls.length > 0 && (
                <div className="flex justify-center items-center min-h-[400px]">
                  {imageUrls.length === 1 ? (
                    // Simple image display for single images
                    <div className="max-w-full max-h-[70vh] flex items-center justify-center">
                      <img
                        src={imageUrls[0]}
                        alt={fileName}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        onError={(e) => {
                          console.error("Image load error:", e);
                          setError("Failed to load image. The file may be corrupted or the URL is invalid.");
                        }}
                      />
                    </div>
                  ) : (
                    // ImageGallery for multiple images
                    <ImageGallery
                      items={imageUrls.map(url => ({ original: url, thumbnail: url }))}
                      showPlayButton={false}
                      showFullscreenButton={true}
                      showThumbnails={imageUrls.length > 1}
                    />
                  )}
                </div>
              )}

              {previewType === 'video' && imageUrls.length > 0 && (
                <div className="flex justify-center">
                  <ReactPlayer
                    url={imageUrls[0]}
                    controls
                    width="100%"
                    height="auto"
                  />
                </div>
              )}

              {previewType === 'audio' && imageUrls.length > 0 && (
                <div className="flex justify-center">
                  <ReactPlayer
                    url={imageUrls[0]}
                    controls
                    width="100%"
                    height="50px"
                  />
                </div>
              )}

              {previewType === 'text' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[60vh]">
                    {textContent}
                  </pre>
                </div>
              )}

              {previewType === 'unsupported' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Preview not available for this file type.
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

