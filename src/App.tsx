import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, toast } from "@heroui/react";
import { FileX } from "lucide-react";
import { Header } from "./components/Header";
import { DropZone } from "./components/DropZone";
import { FileInfo } from "./components/FileInfo";
import { TagEditor } from "./components/TagEditor";
import { CoverArt } from "./components/CoverArt";
import { SaveActions } from "./components/SaveActions";
import type { FlacPicture, ParsedFlac, VorbisTags } from "./lib/types";
import { FlacParseError, parseFlac } from "./lib/flac-parser";
import { writeFlac } from "./lib/flac-writer";
import {
  downloadBytes,
  isFileSystemAccessSupported,
  taggedFilename,
  writeBackToHandle,
  type FileSystemFileHandleLike,
} from "./lib/file-utils";

interface LoadedFile {
  filename: string;
  fileSize: number;
  parsed: ParsedFlac;
  handle: FileSystemFileHandleLike | null;
}

interface EditState {
  tags: VorbisTags;
  picture: FlacPicture | null;
}

function cloneTags(tags: VorbisTags): VorbisTags {
  const out: VorbisTags = {};
  for (const k of Object.keys(tags)) out[k] = [...tags[k]];
  return out;
}

function tagsEqual(a: VorbisTags, b: VorbisTags): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const av = a[k];
    const bv = b[k];
    if (!bv || av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
  }
  return true;
}

function picturesEqual(a: FlacPicture | null, b: FlacPicture | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.data === b.data) return true;
  if (a.data.byteLength !== b.data.byteLength) return false;
  if (a.mimeType !== b.mimeType) return false;
  return false;
}

export default function App() {
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [overwriteOpen, setOverwriteOpen] = useState(false);

  const fsaSupported = useMemo(() => isFileSystemAccessSupported(), []);

  const modified = useMemo(() => {
    if (!loaded || !edit) return false;
    if (!tagsEqual(loaded.parsed.vorbisComment.tags, edit.tags)) return true;
    if (!picturesEqual(loaded.parsed.picture, edit.picture)) return true;
    return false;
  }, [loaded, edit]);

  const modifiedRef = useRef(modified);
  useEffect(() => {
    modifiedRef.current = modified;
  }, [modified]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (modifiedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const parsed = parseFlac(bytes);
      setLoaded({
        filename: file.name,
        fileSize: file.size,
        parsed,
        handle: null,
      });
      setEdit({
        tags: cloneTags(parsed.vorbisComment.tags),
        picture: parsed.picture,
      });
      toast.success("File loaded", { description: file.name });
    } catch (err) {
      const message =
        err instanceof FlacParseError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to read file";
      toast.danger("Could not read file", { description: message });
    }
  }, []);

  const handleNewFile = useCallback(
    (file: File) => {
      if (modifiedRef.current) {
        setPendingFile(file);
      } else {
        void loadFile(file);
      }
    },
    [loadFile],
  );

  const confirmReplace = useCallback(() => {
    if (pendingFile && pendingFile.size > 0) {
      void loadFile(pendingFile);
    } else {
      setLoaded(null);
      setEdit(null);
    }
    setPendingFile(null);
  }, [pendingFile, loadFile]);

  const cancelReplace = useCallback(() => {
    setPendingFile(null);
  }, []);

  const buildOutput = useCallback((): Uint8Array | null => {
    if (!loaded || !edit) return null;
    return writeFlac(loaded.parsed, {
      vendor: loaded.parsed.vorbisComment.vendor || "FLabel",
      tags: edit.tags,
      picture: edit.picture,
    });
  }, [loaded, edit]);

  const handleDownload = useCallback(async () => {
    if (!loaded || !edit) return;
    setSaving(true);
    setProgress(10);
    try {
      await new Promise((r) => setTimeout(r, 0));
      const out = buildOutput();
      setProgress(70);
      if (!out) throw new Error("Failed to build file");
      downloadBytes(out, taggedFilename(loaded.filename));
      setProgress(100);
      toast.success("Download started", { description: taggedFilename(loaded.filename) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.danger("Save failed", { description: message });
    } finally {
      setSaving(false);
      setTimeout(() => setProgress(null), 600);
    }
  }, [loaded, edit, buildOutput]);

  const handleOverwriteRequest = useCallback(() => {
    setOverwriteOpen(true);
  }, []);

  const handleOverwriteConfirm = useCallback(async () => {
    setOverwriteOpen(false);
    if (!loaded) return;
    if (!loaded.handle) {
      toast.warning("Overwrite unavailable", {
        description: "Re-open the file via the picker to use overwrite.",
      });
      return;
    }
    setSaving(true);
    setProgress(10);
    try {
      const out = buildOutput();
      setProgress(70);
      if (!out) throw new Error("Failed to build file");
      await writeBackToHandle(loaded.handle, out);
      setProgress(100);
      const refreshedFile = await loaded.handle.getFile();
      const buffer = await refreshedFile.arrayBuffer();
      const refreshedBytes = new Uint8Array(buffer);
      const refreshedParsed = parseFlac(refreshedBytes);
      setLoaded({
        filename: refreshedFile.name,
        fileSize: refreshedFile.size,
        parsed: refreshedParsed,
        handle: loaded.handle,
      });
      setEdit({
        tags: cloneTags(refreshedParsed.vorbisComment.tags),
        picture: refreshedParsed.picture,
      });
      toast.success("File saved", { description: refreshedFile.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.danger("Overwrite failed", { description: message });
    } finally {
      setSaving(false);
      setTimeout(() => setProgress(null), 600);
    }
  }, [loaded, buildOutput]);

  const handleReset = useCallback(() => {
    if (!loaded) return;
    setEdit({
      tags: cloneTags(loaded.parsed.vorbisComment.tags),
      picture: loaded.parsed.picture,
    });
    toast("Changes discarded");
  }, [loaded]);

  return (
    <div className="dark min-h-full bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {!loaded ? (
          <DropZone onFile={handleNewFile} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Editing</h2>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  if (modified) {
                    setPendingFile(new File([], ""));
                  } else {
                    setLoaded(null);
                    setEdit(null);
                  }
                }}
              >
                <FileX className="mr-1 h-3.5 w-3.5" />
                Close file
              </Button>
            </div>
            <FileInfo
              filename={loaded.filename}
              fileSize={loaded.fileSize}
              streamInfo={loaded.parsed.streamInfo}
            />
            {edit && (
              <SaveActions
                modified={modified}
                saving={saving}
                progress={progress}
                canOverwrite={fsaSupported && loaded.handle !== null}
                onDownload={() => void handleDownload()}
                onOverwrite={handleOverwriteRequest}
                onReset={handleReset}
              />
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {edit && (
                  <TagEditor
                    tags={edit.tags}
                    originalTags={loaded.parsed.vorbisComment.tags}
                    onChange={(tags) => setEdit({ ...edit, tags })}
                  />
                )}
              </div>
              <div className="space-y-6">
                {edit && (
                  <CoverArt
                    picture={edit.picture}
                    modified={!picturesEqual(edit.picture, loaded.parsed.picture)}
                    onChange={(picture) => setEdit({ ...edit, picture })}
                  />
                )}
                <DropZone onFile={handleNewFile} compact />
              </div>
            </div>
          </>
        )}
      </main>

      <Modal isOpen={pendingFile !== null} onOpenChange={(open) => !open && cancelReplace()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Discard unsaved changes?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                You have unsaved changes that will be lost if you{" "}
                {pendingFile && pendingFile.size > 0 ? "load a different file" : "close this file"}.
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={cancelReplace}>
                  Cancel
                </Button>
                <Button variant="danger" onPress={confirmReplace}>
                  Discard and continue
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={overwriteOpen} onOpenChange={setOverwriteOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Overwrite original file?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                This will replace <span className="font-medium">{loaded?.filename}</span> on disk
                with the edited version. The audio data is preserved byte-for-byte.
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setOverwriteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={() => void handleOverwriteConfirm()}>
                  Overwrite
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
