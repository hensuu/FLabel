import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card } from "@heroui/react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import type { FlacPicture } from "../lib/types";

interface CoverArtProps {
  picture: FlacPicture | null;
  modified: boolean;
  onChange: (picture: FlacPicture | null) => void;
}

export function CoverArt({ picture, modified, onChange }: CoverArtProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!picture) return null;
    const ab = new ArrayBuffer(picture.data.byteLength);
    new Uint8Array(ab).set(picture.data);
    const blob = new Blob([ab], { type: picture.mimeType || "image/jpeg" });
    return URL.createObjectURL(blob);
  }, [picture]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const dimensions = await readImageDimensions(file);
      const next: FlacPicture = {
        type: 3, // 3 = front cover
        mimeType: file.type || "image/jpeg",
        description: "",
        width: dimensions.width,
        height: dimensions.height,
        colorDepth: 24,
        colorsUsed: 0,
        data,
      };
      onChange(next);
    } catch (e) {
      console.error(e);
      setError("Could not read the image file.");
    }
  };

  return (
    <Card>
      <Card.Content className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Cover art
            </h2>
            {modified && <span className="flabel-modified-dot" aria-label="Modified" />}
          </div>
        </div>

        {picture && previewUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg bg-surface-secondary">
              <img
                src={previewUrl}
                alt="Cover art"
                className="mx-auto block max-h-64 w-auto object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>{picture.mimeType}</span>
              <span>
                {picture.width}×{picture.height}
              </span>
              <span>{(picture.data.byteLength / 1024).toFixed(0)} KB</span>
            </div>
          </div>
        ) : (
          <div
            className="flex h-40 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-secondary/40 text-muted hover:border-accent/60 hover:bg-accent/5"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="text-center">
              <ImageIcon className="mx-auto h-8 w-8 opacity-50" />
              <p className="mt-2 text-sm">No cover art</p>
              <p className="text-xs">Click to add an image</p>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onPress={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            {picture ? "Replace" : "Add image"}
          </Button>
          {picture && (
            <Button variant="danger-soft" size="sm" onPress={() => onChange(null)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </Card.Content>
    </Card>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
