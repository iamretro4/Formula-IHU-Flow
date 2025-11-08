import { useState, useCallback, DragEvent } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
  currentFile?: File | null;
  uploadProgress?: number;
  isUploading?: boolean;
}

export const FileUploadZone = ({
  onFileSelect,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
  currentFile,
  uploadProgress = 0,
  isUploading = false,
}: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [maxSize, onFileSelect]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging && !disabled
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer hover:border-primary/50"
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm font-medium">Uploading...</p>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs mt-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadProgress}%
                  </p>
                </div>
              )}
            </>
          ) : currentFile ? (
            <>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-medium">{currentFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(currentFile.size)}
              </p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {currentFile && !isUploading && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFileSelect(null as any)}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Remove file
        </Button>
      )}
    </div>
  );
};

