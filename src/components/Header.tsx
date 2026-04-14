import { Music4 } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface/40 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
          <Music4 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">FLabel</h1>
          <p className="text-xs text-muted">FLAC metadata editor — 100% client-side</p>
        </div>
      </div>
      <div className="hidden text-xs text-muted sm:block">Files never leave your browser</div>
    </header>
  );
}
