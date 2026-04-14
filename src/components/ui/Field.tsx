import { Input, Label, TextField } from "@heroui/react";
import type { KeyboardEvent, ReactNode } from "react";

interface FieldProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}

/**
 * A small wrapper around HeroUI v3's TextField composition that gives
 * us a single-line labelled (or unlabelled) text input.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  ariaLabel,
  onKeyDown,
  className,
}: FieldProps) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      fullWidth
      className={className}
    >
      {label && (
        <Label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </Label>
      )}
      <Input placeholder={placeholder} onKeyDown={onKeyDown} />
    </TextField>
  );
}
