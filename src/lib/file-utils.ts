/** Trigger a browser download for a freshly-built file. */
export function downloadBytes(bytes: Uint8Array, filename: string, mimeType = "audio/flac"): void {
  // Create a fresh ArrayBuffer of exactly the right size to avoid SAB / view edge cases
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Format a byte count as a human-readable string (e.g. "12.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format duration in seconds as MM:SS or HH:MM:SS. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Generate a "_tagged" filename that preserves the original extension. */
export function taggedFilename(original: string): string {
  const dot = original.lastIndexOf(".");
  if (dot < 0) return `${original}_tagged`;
  return `${original.slice(0, dot)}_tagged${original.slice(dot)}`;
}

// File System Access API helpers
// The types are not yet in TS lib.dom — declare a minimal shape.
interface FileSystemWritableFileStreamLike {
  write(data: ArrayBuffer | ArrayBufferView | Blob): Promise<void>;
  close(): Promise<void>;
}
interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
  getFile(): Promise<File>;
  name: string;
}

interface FileSystemAccessWindow {
  showOpenFilePicker?: (options?: {
    types?: { description?: string; accept: Record<string, string[]> }[];
    multiple?: boolean;
  }) => Promise<FileSystemFileHandleLike[]>;
}

export function isFileSystemAccessSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as unknown as FileSystemAccessWindow).showOpenFilePicker === "function";
}

export async function openFlacWithHandle(): Promise<{
  file: File;
  handle: FileSystemFileHandleLike;
} | null> {
  const w = window as unknown as FileSystemAccessWindow;
  if (!w.showOpenFilePicker) return null;
  const [handle] = await w.showOpenFilePicker({
    types: [{ description: "FLAC audio", accept: { "audio/flac": [".flac"] } }],
    multiple: false,
  });
  if (!handle) return null;
  const file = await handle.getFile();
  return { file, handle };
}

export async function writeBackToHandle(
  handle: FileSystemFileHandleLike,
  bytes: Uint8Array,
): Promise<void> {
  const writable = await handle.createWritable();
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  await writable.write(ab);
  await writable.close();
}

export type { FileSystemFileHandleLike };
