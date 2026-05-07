import * as React from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
}

export interface FileUploadDropzoneProps {
  files?: UploadedFile[];
  onFilesChange?: (files: File[]) => void;
  onFileRemove?: (id: string) => void;

  maxSize?: number;
  accept?: string;
  className?: string;
}

const FileUploadDropzone = React.forwardRef<HTMLDivElement, FileUploadDropzoneProps>(
  (
    {
      files = [],
      onFilesChange,
      onFileRemove,

      maxSize = 10,
      accept = "application/pdf,.doc,.docx",
      className,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles && droppedFiles.length > 0) {
        onFilesChange?.(droppedFiles);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        onFilesChange?.(selectedFiles);
      }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 KB";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileExtension = (filename: string) => {
      const ext = filename.split(".").pop()?.toUpperCase();
      return ext?.substring(0, 3) || "FILE";
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "w-full bg-background rounded-xl border border-border shadow-sm",
          className
        )}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Upload Document</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select and upload documents for AI analysis.
              </p>
            </div>
          </div>

          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer",
              isDragging
                ? "border-primary bg-primary/10 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">
              Choose a file or drag & drop it here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              PDF, DOC, and DOCX formats, up to {maxSize} MB
            </p>
            <Button variant="outline" size="sm" className="pointer-events-none">
              Browse Files
            </Button>
          </div>
        </div>

        {files.length > 0 && (
          <div className="px-6 pb-6 border-t border-border pt-6">
            <div className="space-y-3">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-md bg-background border border-border text-xs font-bold text-muted-foreground flex-shrink-0">
                      {getFileExtension(file.file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {file.status === "uploading" && (
                          <span>
                            {formatFileSize((file.file.size * file.progress) / 100)} of{" "}
                            {formatFileSize(file.file.size)}
                          </span>
                        )}
                        {file.status === "completed" && (
                          <span>{formatFileSize(file.file.size)}</span>
                        )}
                        <span>•</span>
                        <span
                          className={cn(
                            file.status === "uploading" && "text-primary",
                            file.status === "completed" && "text-green-500"
                          )}
                        >
                          {file.status === "uploading" ? "Uploading..." : "Completed"}
                        </span>
                      </div>
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="h-1.5 mt-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.status === "completed" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileRemove?.(file.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

FileUploadDropzone.displayName = "FileUploadDropzone";

export { FileUploadDropzone };
