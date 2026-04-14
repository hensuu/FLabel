import { Button, ProgressBar } from "@heroui/react";
import { Download, RefreshCw, Save } from "lucide-react";

interface SaveActionsProps {
  modified: boolean;
  saving: boolean;
  progress: number | null;
  canOverwrite: boolean;
  onDownload: () => void;
  onOverwrite: () => void;
  onReset: () => void;
}

export function SaveActions({
  modified,
  saving,
  progress,
  canOverwrite,
  onDownload,
  onOverwrite,
  onReset,
}: SaveActionsProps) {
  return (
    <div className="flabel-card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onPress={onDownload} isDisabled={saving}>
          <Download className="mr-1.5 h-4 w-4" />
          Download FLAC
        </Button>
        {canOverwrite && (
          <Button variant="secondary" onPress={onOverwrite} isDisabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            Overwrite original
          </Button>
        )}
        <Button variant="ghost" onPress={onReset} isDisabled={saving || !modified}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Discard changes
        </Button>
        <div className="ml-auto text-xs text-muted">
          {modified ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              Unsaved changes
            </span>
          ) : (
            <span>No changes</span>
          )}
        </div>
      </div>
      {progress !== null && (
        <ProgressBar aria-label="Saving" value={progress} className="max-w-md" />
      )}
    </div>
  );
}
