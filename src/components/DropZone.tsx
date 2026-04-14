import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileAudio, Upload } from "lucide-react";

interface DropZoneProps {
  onFile: (file: File) => void;
  compact?: boolean;
}

export function DropZone({ onFile, compact = false }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-drag-over={dragOver}
      className={[
        "flabel-dropzone group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl",
        compact ? "gap-2 px-6 py-6" : "gap-4 px-8 py-16",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-center rounded-full bg-accent-soft text-accent transition-transform group-hover:scale-110",
          compact ? "h-10 w-10" : "h-16 w-16",
        ].join(" ")}
      >
        {dragOver ? (
          <FileAudio className={compact ? "h-5 w-5" : "h-8 w-8"} />
        ) : (
          <Upload className={compact ? "h-5 w-5" : "h-8 w-8"} />
        )}
      </div>
      <div className="text-center">
        <p className={compact ? "text-sm font-medium" : "text-lg font-semibold"}>
          {dragOver ? "Drop your FLAC file here" : "Drop a FLAC file or click to browse"}
        </p>
        {!compact && (
          <p className="mt-1 text-sm text-muted">
            Your file is processed entirely in the browser. Nothing is uploaded.
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".flac,audio/flac,audio/x-flac"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
