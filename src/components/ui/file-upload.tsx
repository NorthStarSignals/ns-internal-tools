"use client";

import { useCallback, useState } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
}

export function FileUpload({
  onUpload,
  accept = ".pdf,.docx,.xlsx,.csv",
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 50MB
  label = "Upload files",
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        if (file.size > maxSize) {
          alert(`${file.name} exceeds the ${Math.round(maxSize / 1024 / 1024)}MB limit`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setSelectedFiles(validFiles);
      setUploading(true);
      try {
        await onUpload(validFiles);
      } finally {
        setUploading(false);
        setSelectedFiles([]);
      }
    },
    [onUpload, maxSize]
  );

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
        dragOver
          ? "border-accent-blue bg-accent-blue/5"
          : "border-navy-600 hover:border-navy-500"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.multiple = multiple;
        input.onchange = () => handleFiles(input.files);
        input.click();
      }}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent-blue" size={32} />
          <p className="text-sm text-slate-300">
            Uploading {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""}...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="text-slate-500" size={32} />
          <div>
            <p className="text-sm font-medium text-slate-300">{label}</p>
            <p className="text-xs text-slate-500 mt-1">
              Drag & drop or click to browse. {accept.replace(/\./g, "").toUpperCase()} supported.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface FileListItemProps {
  name: string;
  size?: number;
  status?: string;
  onRemove?: () => void;
}

export function FileListItem({ name, size, status, onRemove }: FileListItemProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-navy-900 rounded-lg">
      <File size={16} className="text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{name}</p>
        {size && (
          <p className="text-xs text-slate-500">
            {(size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>
      {status && (
        <span className="text-xs text-slate-400">{status}</span>
      )}
      {onRemove && (
        <button onClick={onRemove} className="p-1 hover:bg-navy-700 rounded">
          <X size={14} className="text-slate-500" />
        </button>
      )}
    </div>
  );
}
