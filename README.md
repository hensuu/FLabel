# FLabel

> Browser-based FLAC metadata editor. 100% client-side — your audio files never leave your machine.

FLabel is a privacy-friendly, zero-backend alternative to traditional desktop tag editors like Mp3tag, Kid3, and EasyTAG. It reads, displays, edits, and writes FLAC `VORBIS_COMMENT` tags and `PICTURE` cover art entirely in the browser using a custom FLAC binary parser/writer. Audio frames are copied byte-for-byte — there is no re-encoding and no quality loss.

## Phase 1 features

- Drag-and-drop FLAC file loading (or click to browse)
- Validation against the `fLaC` magic bytes
- File info display: filename, size, duration, sample rate, bit depth, channels
- Editable form for the standard tag fields (`TITLE`, `ARTIST`, `ALBUM`, `ALBUMARTIST`, `DATE`, `GENRE`, `TRACKNUMBER`, `DISCNUMBER`, `COMMENT`)
- Generic key-value list for non-standard Vorbis Comment fields
- Multiple values per key (e.g. multiple `ARTIST` entries)
- Add new tags, remove existing tags, clear all tags
- Visual diff: modified fields show a warning dot
- Cover art: display, replace (JPG/PNG), remove
- Download the modified FLAC (`{name}_tagged.flac`)
- Overwrite original file in place via the File System Access API (Chrome/Edge only)
- Unsaved-changes warning when navigating away or loading another file
- Dark mode by default

## Tech stack

- **Vite** + **React 19** + **TypeScript**
- **HeroUI v3** (React Aria Components-based)
- **Tailwind CSS v4**
- **Lucide React** icons
- Custom FLAC binary parser and writer in `src/lib/`

## Local development

```bash
pnpm install
pnpm dev
```

Build a production bundle:

```bash
pnpm build
pnpm preview
```

## Project layout

```
src/
├── lib/
│   ├── types.ts            # Type definitions
│   ├── flac-parser.ts      # FLAC binary parser
│   ├── flac-writer.ts      # FLAC binary writer
│   └── file-utils.ts       # File System Access API helpers + download trigger
└── components/
    ├── Header.tsx
    ├── DropZone.tsx
    ├── FileInfo.tsx
    ├── TagEditor.tsx
    ├── TagField.tsx
    ├── CoverArt.tsx
    ├── SaveActions.tsx
    └── ui/
        └── Field.tsx       # Thin wrapper around HeroUI v3 TextField composition
```

## License

MIT
