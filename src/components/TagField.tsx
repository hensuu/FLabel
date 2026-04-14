import { Plus, Trash2 } from "lucide-react";
import { Field } from "./ui/Field";

interface TagFieldProps {
  label: string;
  tagKey: string;
  values: string[];
  modified: boolean;
  onChange: (values: string[]) => void;
  /** Whether this field allows multiple values (e.g. ARTIST). */
  multi?: boolean;
}

export function TagField({ label, tagKey, values, modified, onChange, multi = false }: TagFieldProps) {
  const display = values.length === 0 ? [""] : values;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
          {modified && <span className="flabel-modified-dot" aria-label="Modified" />}
        </span>
        {multi && (
          <button
            type="button"
            onClick={() => onChange([...display, ""])}
            className="flabel-icon-btn h-6 w-6"
            aria-label={`Add another ${label}`}
            title={`Add another ${label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {display.map((value, idx) => (
          <div key={`${tagKey}-${idx}`} className="flex items-center gap-1.5">
            <Field
              ariaLabel={`${label} value ${idx + 1}`}
              value={value}
              onChange={(v) => {
                const next = [...display];
                next[idx] = v;
                onChange(next);
              }}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="flex-1"
            />
            {multi && display.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
                className="flabel-icon-btn flabel-icon-btn--danger"
                aria-label={`Remove ${label} value ${idx + 1}`}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
