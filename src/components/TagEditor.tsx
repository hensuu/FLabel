import { useMemo, useState } from "react";
import { Button, Card, Separator } from "@heroui/react";
import { Eraser, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { STANDARD_TAG_KEYS, type StandardTagKey, type VorbisTags } from "../lib/types";
import { TagField } from "./TagField";
import { Field } from "./ui/Field";

interface TagEditorProps {
  tags: VorbisTags;
  originalTags: VorbisTags;
  onChange: (tags: VorbisTags) => void;
}

const STANDARD_LABELS: Record<StandardTagKey, string> = {
  TITLE: "Title",
  ARTIST: "Artist",
  ALBUM: "Album",
  ALBUMARTIST: "Album artist",
  DATE: "Year",
  GENRE: "Genre",
  TRACKNUMBER: "Track #",
  DISCNUMBER: "Disc #",
  COMMENT: "Comment",
};

/** Tag keys that commonly carry multiple values. */
const MULTI_VALUE_KEYS = new Set<string>(["ARTIST", "ALBUMARTIST", "GENRE", "COMPOSER", "PERFORMER"]);

function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === 0 && (b?.length ?? 0) === 0;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function TagEditor({ tags, originalTags, onChange }: TagEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const customKeys = useMemo(() => {
    const std = new Set<string>(STANDARD_TAG_KEYS);
    return Object.keys(tags).filter((k) => !std.has(k));
  }, [tags]);

  const setRawTag = (key: string, values: string[]) => {
    const next = { ...tags };
    next[key] = values;
    onChange(next);
  };

  const removeTag = (key: string) => {
    const next = { ...tags };
    delete next[key];
    onChange(next);
  };

  const addNewTag = () => {
    const key = newKey.trim().toUpperCase();
    if (!key) return;
    const next = { ...tags };
    if (!next[key]) next[key] = [];
    next[key] = [...next[key], newValue];
    onChange(next);
    setNewKey("");
    setNewValue("");
  };

  const clearAll = () => onChange({});

  const isModified = (key: string): boolean => {
    return !arraysEqual(tags[key], originalTags[key]);
  };

  return (
    <Card>
      <Card.Content className="flex flex-col gap-5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Tags</h2>
          </div>
          <Button variant="danger-soft" size="sm" onPress={clearAll}>
            <Eraser className="mr-1 h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {STANDARD_TAG_KEYS.map((key) => (
            <TagField
              key={key}
              label={STANDARD_LABELS[key]}
              tagKey={key}
              values={tags[key] ?? []}
              modified={isModified(key)}
              onChange={(values) => setRawTag(key, values)}
              multi={MULTI_VALUE_KEYS.has(key)}
            />
          ))}
        </div>

        {customKeys.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Other tags
              </h3>
              {customKeys.map((key) => (
                <div key={key} className="flex items-start gap-2">
                  <div
                    className="w-40 shrink-0 truncate pt-2 font-mono text-xs text-muted"
                    title={key}
                  >
                    {key}
                    {isModified(key) && <span className="flabel-modified-dot" />}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {(tags[key] ?? [""]).map((value, idx) => (
                      <Field
                        key={`${key}-${idx}`}
                        ariaLabel={`${key} value ${idx + 1}`}
                        value={value}
                        onChange={(v) => {
                          const arr = [...(tags[key] ?? [])];
                          arr[idx] = v;
                          setRawTag(key, arr);
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTag(key)}
                    className="flabel-icon-btn flabel-icon-btn--danger mt-1"
                    aria-label={`Remove ${key}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Add new tag</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Field
              ariaLabel="New tag key"
              value={newKey}
              onChange={setNewKey}
              placeholder="KEY (e.g. COMPOSER)"
              className="sm:max-w-[180px]"
            />
            <Field
              ariaLabel="New tag value"
              value={newValue}
              onChange={setNewValue}
              placeholder="value"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") addNewTag();
              }}
            />
            <Button variant="primary" size="sm" onPress={addNewTag} isDisabled={!newKey.trim()}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        <p className="-mt-2 text-xs text-muted">
          Changes apply when you click <span className="font-medium text-foreground">Download FLAC</span>.
        </p>
      </Card.Content>
    </Card>
  );
}
