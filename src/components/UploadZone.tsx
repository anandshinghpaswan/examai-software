"use client";

import { useRef, useState } from "react";
import { CloseIcon, UploadIcon } from "@/components/Icons";

type UploadZoneProps = {
  files: File[];
  onFiles: (files: File[]) => void;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

export default function UploadZone({
  files,
  onFiles,
  compact = false,
  title = "Drag & Drop your file here",
  subtitle = "PDF, JPG, JPEG, PNG, WEBP · Up to 50 MB total",
  disabled = false
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function mergeFiles(next: File[]) {
    const map = new Map<string, File>();
    [...files, ...next].forEach((file) => {
      map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
    });
    onFiles(Array.from(map.values()).slice(0, 12));
  }

  function remove(index: number) {
    onFiles(files.filter((_, i) => i !== index));
  }

  return (
    <div
      className={`uploadZone ${compact ? "uploadZoneCompact" : ""} ${dragging ? "isDragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) mergeFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        hidden
        disabled={disabled}
        onChange={(event) => {
          mergeFiles(Array.from(event.target.files || []));
          event.currentTarget.value = "";
        }}
      />

      <div className="uploadCloud"><UploadIcon size={compact ? 25 : 42} /></div>
      <div className="uploadTitle">{title}</div>
      {!compact && <div className="uploadOr">or</div>}
      <button
        className={compact ? "outlineButton" : "primaryButton"}
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose File{files.length ? "s" : ""}
      </button>
      <div className="uploadSubtitle">{subtitle}</div>

      {files.length > 0 && (
        <div className="fileChips">
          {files.map((file, index) => (
            <div className="fileChip" key={`${file.name}-${file.lastModified}-${index}`}>
              <span className="fileChipName" title={file.name}>{file.name}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => remove(index)}>
                <CloseIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
