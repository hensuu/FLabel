// FLAC metadata block types (per FLAC format spec)
export const BLOCK_TYPE_STREAMINFO = 0;
export const BLOCK_TYPE_PADDING = 1;
export const BLOCK_TYPE_APPLICATION = 2;
export const BLOCK_TYPE_SEEKTABLE = 3;
export const BLOCK_TYPE_VORBIS_COMMENT = 4;
export const BLOCK_TYPE_CUESHEET = 5;
export const BLOCK_TYPE_PICTURE = 6;

export interface StreamInfo {
  minBlockSize: number;
  maxBlockSize: number;
  minFrameSize: number;
  maxFrameSize: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  totalSamples: number;
  md5: string;
}

/** Vorbis comment tag list. Keys are uppercase. Each key may have multiple values. */
export type VorbisTags = Record<string, string[]>;

export interface VorbisComment {
  vendor: string;
  tags: VorbisTags;
}

export interface FlacPicture {
  type: number; // 0–20, 3 = front cover
  mimeType: string;
  description: string;
  width: number;
  height: number;
  colorDepth: number;
  colorsUsed: number;
  data: Uint8Array;
}

/** A raw metadata block kept as bytes — used for blocks we don't manipulate. */
export interface RawBlock {
  type: number;
  data: Uint8Array;
}

export interface ParsedFlac {
  streamInfo: StreamInfo;
  vorbisComment: VorbisComment;
  picture: FlacPicture | null;
  /** All other metadata blocks kept verbatim (excluding streaminfo, vorbis_comment, picture, padding) */
  otherBlocks: RawBlock[];
  /** Byte offset where the audio frames start in the original file */
  audioOffset: number;
  /** Original file as a Uint8Array — reused for byte-for-byte audio copy */
  originalBytes: Uint8Array;
}

export const STANDARD_TAG_KEYS = [
  "TITLE",
  "ARTIST",
  "ALBUM",
  "ALBUMARTIST",
  "DATE",
  "GENRE",
  "TRACKNUMBER",
  "DISCNUMBER",
  "COMMENT",
] as const;

export type StandardTagKey = (typeof STANDARD_TAG_KEYS)[number];
