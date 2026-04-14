import {
  BLOCK_TYPE_PICTURE,
  BLOCK_TYPE_STREAMINFO,
  BLOCK_TYPE_VORBIS_COMMENT,
  type FlacPicture,
  type ParsedFlac,
  type VorbisTags,
} from "./types";

const FLAC_MAGIC = new Uint8Array([0x66, 0x4c, 0x61, 0x43]); // "fLaC"

interface BuiltBlock {
  type: number;
  data: Uint8Array;
}

export interface WriteFlacOptions {
  vendor: string;
  tags: VorbisTags;
  picture: FlacPicture | null;
}

/**
 * Reconstruct a FLAC file from a parsed source plus modified metadata.
 * The original audio frames are byte-copied — the audio data is never re-encoded.
 */
export function writeFlac(parsed: ParsedFlac, options: WriteFlacOptions): Uint8Array {
  const blocks: BuiltBlock[] = [];

  // STREAMINFO must come first. Re-emit the original 34 bytes of streaminfo, byte-for-byte,
  // by extracting them from the original file.
  const streamInfoData = extractOriginalStreamInfo(parsed);
  blocks.push({ type: BLOCK_TYPE_STREAMINFO, data: streamInfoData });

  // Preserve any opaque blocks (SEEKTABLE, APPLICATION, CUESHEET, …) verbatim.
  for (const b of parsed.otherBlocks) {
    blocks.push({ type: b.type, data: b.data });
  }

  blocks.push({
    type: BLOCK_TYPE_VORBIS_COMMENT,
    data: buildVorbisComment(options.vendor, options.tags),
  });

  if (options.picture) {
    blocks.push({ type: BLOCK_TYPE_PICTURE, data: buildPicture(options.picture) });
  }

  // Compute total metadata size
  let metadataSize = 0;
  for (const block of blocks) {
    metadataSize += 4 + block.data.length;
  }

  // Audio frames (copied byte-for-byte)
  const audio = parsed.originalBytes.subarray(parsed.audioOffset);

  const out = new Uint8Array(4 + metadataSize + audio.length);
  let p = 0;
  out.set(FLAC_MAGIC, p);
  p += 4;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLast = i === blocks.length - 1;
    out[p] = (isLast ? 0x80 : 0x00) | (block.type & 0x7f);
    out[p + 1] = (block.data.length >> 16) & 0xff;
    out[p + 2] = (block.data.length >> 8) & 0xff;
    out[p + 3] = block.data.length & 0xff;
    p += 4;
    out.set(block.data, p);
    p += block.data.length;
  }

  out.set(audio, p);
  return out;
}

/**
 * Walk the original file's metadata blocks and copy the STREAMINFO block contents
 * verbatim. This guarantees the writer doesn't accidentally corrupt the streaminfo
 * (especially the MD5 audio signature).
 */
function extractOriginalStreamInfo(parsed: ParsedFlac): Uint8Array {
  const bytes = parsed.originalBytes;
  let offset = 4;
  while (offset < bytes.length) {
    const header = bytes[offset];
    const isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockLength =
      (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;
    if (blockType === BLOCK_TYPE_STREAMINFO) {
      return new Uint8Array(bytes.subarray(offset, offset + blockLength));
    }
    offset += blockLength;
    if (isLast) break;
  }
  throw new Error("Original file is missing STREAMINFO");
}

function buildVorbisComment(vendor: string, tags: VorbisTags): Uint8Array {
  const encoder = new TextEncoder();
  const vendorBytes = encoder.encode(vendor);

  // Flatten tags into KEY=VALUE entries, preserving order roughly by Object.keys.
  // Empty values are kept (the user may have intentionally left a tag blank).
  const entries: Uint8Array[] = [];
  for (const key of Object.keys(tags)) {
    for (const value of tags[key]) {
      entries.push(encoder.encode(`${key}=${value}`));
    }
  }

  let total = 4 + vendorBytes.length + 4;
  for (const e of entries) total += 4 + e.length;

  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let p = 0;
  dv.setUint32(p, vendorBytes.length, true);
  p += 4;
  out.set(vendorBytes, p);
  p += vendorBytes.length;
  dv.setUint32(p, entries.length, true);
  p += 4;
  for (const e of entries) {
    dv.setUint32(p, e.length, true);
    p += 4;
    out.set(e, p);
    p += e.length;
  }
  return out;
}

function buildPicture(picture: FlacPicture): Uint8Array {
  const encoder = new TextEncoder();
  const mimeBytes = encoder.encode(picture.mimeType);
  const descBytes = encoder.encode(picture.description);

  const total =
    4 + // type
    4 + // mime length
    mimeBytes.length +
    4 + // desc length
    descBytes.length +
    4 + // width
    4 + // height
    4 + // color depth
    4 + // colors used
    4 + // data length
    picture.data.length;

  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let p = 0;
  dv.setUint32(p, picture.type, false);
  p += 4;
  dv.setUint32(p, mimeBytes.length, false);
  p += 4;
  out.set(mimeBytes, p);
  p += mimeBytes.length;
  dv.setUint32(p, descBytes.length, false);
  p += 4;
  out.set(descBytes, p);
  p += descBytes.length;
  dv.setUint32(p, picture.width, false);
  p += 4;
  dv.setUint32(p, picture.height, false);
  p += 4;
  dv.setUint32(p, picture.colorDepth, false);
  p += 4;
  dv.setUint32(p, picture.colorsUsed, false);
  p += 4;
  dv.setUint32(p, picture.data.length, false);
  p += 4;
  out.set(picture.data, p);
  return out;
}
