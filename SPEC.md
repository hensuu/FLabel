# FLabel — Product Specification

## Overview

**FLabel** is a browser-based FLAC metadata editor that runs entirely client-side. Files never leave the user's machine — all parsing, editing, and writing happen in the browser using the Web File API and ArrayBuffer manipulation. This makes FLabel a privacy-friendly, zero-backend alternative to traditional desktop tag editors like Mp3tag, Kid3, and EasyTAG.

### Problem Statement

Existing online audio metadata editors (e.g. SoundTools) fail to read and display existing metadata from uploaded files, forcing users to re-enter all tag information from scratch. Desktop tools like Mp3tag handle this well but require installation and are not cross-platform. There is a gap in the market for a lightweight, browser-based tool that can **read, display, edit, and write** FLAC metadata seamlessly — without uploading files to any server.

### Target Users

- Music collectors who maintain organized FLAC libraries (especially Vocaloid, doujin music, and lossless audio enthusiasts)
- Users who want quick tag edits without installing desktop software
- Privacy-conscious users who do not want to upload audio files to third-party servers

---

## Tech Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| Build tool         | Vite                                |
| Framework          | React 19                            |
| Language           | TypeScript                          |
| UI library         | HeroUI v3 (React Aria-based)        |
| Styling            | Tailwind CSS v4                     |
| Icons              | Lucide React                        |
| Animation          | Framer Motion                       |
| FLAC reading       | music-metadata (browser mode)       |
| FLAC writing       | Custom FLAC binary writer           |
| Hosting            | GitHub Pages or Cloudflare Pages    |
| Package manager    | pnpm                                |
| License            | MIT                                 |

---

## Architecture

### Core Principle: Zero Server Dependency

The entire application is a static site. All file operations use browser APIs:

- **Reading files**: `File API` → `ArrayBuffer`
- **Writing files (primary)**: Modified `ArrayBuffer` → `Blob` → trigger download. Works on all modern browsers.
- **Writing files (enhanced)**: `File System Access API` → write back to original file on disk. Chrome/Edge only. Falls back to download on unsupported browsers.

### FLAC Binary Format (Reference)

A FLAC file consists of:

1. **Magic bytes**: `fLaC` (4 bytes)
2. **Metadata blocks** (sequential, variable length):
   - Each block has a 4-byte header:
     - Bit 0 of byte 0: `1` if this is the last metadata block before audio data
     - Bits 1–7 of byte 0: block type
     - Bytes 1–3: block data length (24-bit big-endian unsigned integer)
   - Block types:
     - `0` — STREAMINFO (mandatory, always first)
     - `1` — PADDING
     - `2` — APPLICATION
     - `3` — SEEKTABLE
     - `4` — VORBIS_COMMENT (contains tags)
     - `5` — CUESHEET
     - `6` — PICTURE (contains cover art)
   - Block data follows immediately after the header
3. **Audio frames** (the actual audio data, left untouched during metadata editing)

### Metadata Editing Strategy

To edit metadata without re-encoding audio:

1. Parse all metadata blocks from the original file
2. Modify the VORBIS_COMMENT block (tags) and/or PICTURE block (cover art) as needed
3. Reconstruct the file: `magic bytes` + `modified metadata blocks` + `original audio frames`
4. The audio data is byte-copied as-is, preserving 100% audio quality

---

## Feature Specification

### Phase 1 — Single File Complete Flow (Week 1–2)

This phase delivers a fully functional single-file editor that can be deployed and demonstrated.

#### F1.1 File Input

- **Drag-and-drop zone**: Users can drag a `.flac` file onto a prominent drop area
- **File picker fallback**: Click the drop zone to open a native file dialog
- **Validation**: Reject non-FLAC files with a clear error toast. Validate by checking the `fLaC` magic bytes
- **File info display**: After loading, show filename, file size (human-readable), duration, sample rate, bit depth, and number of channels (parsed from STREAMINFO block)

#### F1.2 Read & Display Existing Tags

- Parse the VORBIS_COMMENT metadata block
- Display all existing tags in an editable form
- Standard fields displayed with dedicated inputs:
  - `TITLE`
  - `ARTIST`
  - `ALBUM`
  - `ALBUMARTIST`
  - `DATE` (year)
  - `GENRE`
  - `TRACKNUMBER`
  - `DISCNUMBER`
  - `COMMENT`
- All other non-standard Vorbis Comment fields displayed in a generic key-value list
- Support for multiple values per key (e.g. multiple `ARTIST` entries)

#### F1.3 Edit Tags

- Inline editing of all displayed tag fields
- Add new tag (key-value pair)
- Remove existing tags
- Clear all tags
- Visual diff: highlight fields that have been modified compared to the original

#### F1.4 Cover Art

- Display existing cover art (from PICTURE metadata block) as a thumbnail with dimensions shown
- Replace cover art: click to upload a new image (JPG/PNG)
- Preview new cover art before saving
- Remove cover art
- Display MIME type and image dimensions

#### F1.5 Save / Export

- **Download button**: Generate a new FLAC file with modified metadata and trigger browser download
  - Default filename: `{original_filename}_tagged.flac`
- **Overwrite original** (Chrome/Edge only): Using the File System Access API, write directly back to the original file location
  - Show a confirmation dialog before overwriting
  - Detect browser support and show/hide this option accordingly
- Progress indicator for large files during the save process

#### F1.6 UI/UX Requirements

- Dark mode by default (suits music library management aesthetic)
- Responsive layout but optimized for desktop (primary use case)
- Keyboard accessible (tab navigation through all form fields)
- Toast notifications for success/error states
- Empty state with clear call-to-action when no file is loaded
- "Unsaved changes" warning if user tries to load a new file or close the tab with pending edits

---

### Phase 2 — Batch Processing & Enhanced Features (Week 3–4)

#### F2.1 Multi-File Loading

- Accept multiple FLAC files via drag-and-drop or file picker
- Display a file list/sidebar showing all loaded files
- Click a file to switch to its tag editor
- Visual indicators: edited (yellow dot), saved (green check), unmodified (no indicator)

#### F2.2 Batch Tag Editing

- Select multiple files from the file list
- Edit shared fields across all selected files simultaneously
- Common use case: select all tracks in an album → set `ALBUM`, `ALBUMARTIST`, `DATE`, `GENRE` once for all files
- Per-file fields (like `TITLE`, `TRACKNUMBER`) remain individually editable

#### F2.3 File System Access API Integration

- For supported browsers, allow users to grant directory access
- Read FLAC files directly from a folder
- Write modified files back to the same directory
- Fallback: batch download as individual files (or as a ZIP archive if feasible)

#### F2.4 Additional Features (Stretch)

- Auto-number tracks based on file list order
- Filename → tag parsing (extract artist/title from filename patterns)
- Tag → filename renaming (generate filenames from tag data)

---

## Project Structure

```
flabel/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
├── pnpm-lock.yaml
├── .npmrc                          # pnpm hoisting config for HeroUI
├── .gitignore
├── LICENSE                         # MIT
├── README.md
├── public/
│   └── favicon.svg
└── src/
    ├── index.css                   # Tailwind v4 + HeroUI styles import
    ├── main.tsx                    # React entry point with HeroUIProvider
    ├── App.tsx                     # Main app layout and state management
    ├── lib/
    │   ├── types.ts                # TypeScript type definitions
    │   ├── flac-parser.ts          # FLAC binary parser (reads metadata blocks)
    │   ├── flac-writer.ts          # FLAC binary writer (reconstructs file with modified metadata)
    │   └── file-utils.ts           # File System Access API helpers, download trigger
    └── components/
        ├── Header.tsx              # App header with logo and dark mode toggle
        ├── DropZone.tsx            # Drag-and-drop file upload area
        ├── FileInfo.tsx            # File metadata display (duration, sample rate, etc.)
        ├── TagEditor.tsx           # Vorbis Comment tag editing form
        ├── CoverArt.tsx            # Cover art display, replace, and remove
        ├── TagField.tsx            # Single tag field input component
        ├── SaveActions.tsx         # Download / overwrite buttons with progress
        └── Toast.tsx               # Toast notification wrapper (if needed beyond HeroUI)
```

---

## Key Technical Decisions

### Why custom FLAC writer instead of an existing library?

- `music-metadata` is read-only; it cannot write metadata
- `FLACMetadataEditor` (GitHub: AHOHNMYC/FLACMetadataEditor) is not published on npm and has limited maintenance
- FLAC metadata writing is straightforward (reconstruct header + metadata blocks + copy audio data) and serves as an excellent learning exercise in binary data manipulation with TypeScript
- Having a custom parser/writer means zero runtime dependency for the core functionality

### Why HeroUI over shadcn/ui?

- HeroUI provides polished default styles out of the box, reducing time spent on CSS
- Built on React Aria, ensuring accessibility compliance without extra effort
- Tailwind CSS v4 native support in v3
- Aesthetic alignment with the desired look and feel of the application

### Why no Next.js?

- The application is 100% client-side with zero server logic
- No SSR, no API routes, no dynamic routing needed
- Vite provides faster development experience and simpler configuration
- The final build output is a static site deployable to any CDN

---

## Open Source & Deployment

### Repository

- GitHub repository: `flabel`
- License: MIT
- README with: project description, screenshot/demo GIF, tech stack badges, local development instructions, and deployment guide

### Deployment

- **Primary**: Cloudflare Pages (free, fast global CDN, automatic deploys from GitHub)
- **Alternative**: GitHub Pages
- Custom domain (optional): `flabel.dev` or similar, if available

### CI/CD

- GitHub Actions workflow:
  - On push to `main`: build with `pnpm build`, deploy to Cloudflare Pages
  - On pull request: build check only

---

## Success Criteria

### Phase 1 Complete When:

- [ ] User can drag a FLAC file into the browser and see all existing tags and cover art
- [ ] User can edit any tag field, add new tags, and remove existing tags
- [ ] User can replace or remove cover art
- [ ] User can download the modified FLAC file with all changes applied
- [ ] Audio data is preserved byte-for-byte (no re-encoding)
- [ ] The app is deployed and accessible via a public URL
- [ ] The GitHub repository has a clean README with usage instructions

### Phase 2 Complete When:

- [ ] User can load multiple FLAC files at once
- [ ] User can batch-edit shared fields across multiple files
- [ ] File System Access API integration works on supported browsers
- [ ] Graceful fallback on unsupported browsers
