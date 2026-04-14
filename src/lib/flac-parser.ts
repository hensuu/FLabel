import {
  BLOCK_TYPE_PADDING,
  BLOCK_TYPE_PICTURE,
  BLOCK_TYPE_STREAMINFO,
  BLOCK_TYPE_VORBIS_COMMENT,
  type FlacPicture,
  type ParsedFlac,
  type RawBlock,
  type StreamInfo,
  type VorbisComment,
  type VorbisTags,
} from "./types";

const FLAC_MAGIC = [0x66, 0x4c, 0x61, 0x43]; // "fLaC"

export class FlacParseError extends Error {}

/** Quickly verify that a buffer begins with the fLaC magic bytes. */
export function isFlacBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== FLAC_MAGIC[i]) return false;
  }
  return true;
}

/** Parse a FLAC file. Throws FlacParseError on invalid input. */
export function parseFlac(bytes: Uint8Array): ParsedFlac {
  if (!isFlacBuffer(bytes)) {
    throw new FlacParseError("Not a valid FLAC file (missing fLaC magic bytes)");
  }

  let offset = 4;
  let streamInfo: StreamInfo | null = null;
  let vorbisComment: VorbisComment = { vendor: "FLabel", tags: {} };
  let picture: FlacPicture | null = null;
  const otherBlocks: RawBlock[] = [];

  while (true) {
    if (offset + 4 > bytes.length) {
      throw new FlacParseError("Unexpected end of file while reading metadata block header");
    }
    const header = bytes[offset];
    const isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockLength = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;

    if (offset + blockLength > bytes.length) {
      throw new FlacParseError(`Metadata block length exceeds file size (type=${blockType})`);
    }

    const blockData = bytes.subarray(offset, offset + blockLength);

    switch (blockType) {
      case BLOCK_TYPE_STREAMINFO:
        streamInfo = parseStreamInfo(blockData);
        break;
      case BLOCK_TYPE_VORBIS_COMMENT:
        vorbisComment = parseVorbisComment(blockData);
        break;
      case BLOCK_TYPE_PICTURE:
        // Phase 1: keep only the first PICTURE block
        if (picture === null) {
          picture = parsePicture(blockData);
        } else {
          otherBlocks.push({ type: blockType, data: copyBytes(blockData) });
        }
        break;
      case BLOCK_TYPE_PADDING:
        // Padding is reconstructed by the writer; skip
        break;
      default:
        otherBlocks.push({ type: blockType, data: copyBytes(blockData) });
        break;
    }

    offset += blockLength;
    if (isLast) break;
  }

  if (!streamInfo) {
    throw new FlacParseError("FLAC file is missing the mandatory STREAMINFO block");
  }

  return {
    streamInfo,
    vorbisComment,
    picture,
    otherBlocks,
    audioOffset: offset,
    originalBytes: bytes,
  };
}

function copyBytes(view: Uint8Array): Uint8Array {
  return new Uint8Array(view);
}

function parseStreamInfo(data: Uint8Array): StreamInfo {
  if (data.length < 34) {
    throw new FlacParseError("STREAMINFO block is too short");
  }
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const minBlockSize = dv.getUint16(0, false);
  const maxBlockSize = dv.getUint16(2, false);
  const minFrameSize = (data[4] << 16) | (data[5] << 8) | data[6];
  const maxFrameSize = (data[7] << 16) | (data[8] << 8) | data[9];

  // Sample rate (20 bits), channels (3 bits), bits/sample (5 bits), total samples (36 bits)
  // packed across bytes 10..17
  const b10 = data[10];
  const b11 = data[11];
  const b12 = data[12];
  const b13 = data[13];
  const sampleRate = (b10 << 12) | (b11 << 4) | (b12 >> 4);
  const channels = ((b12 >> 1) & 0x07) + 1;
  const bitsPerSample = (((b12 & 0x01) << 4) | (b13 >> 4)) + 1;
  // Total samples: lower 4 bits of b13 + bytes 14..17 = 36 bits
  const high4 = b13 & 0x0f;
  const lowerBits =
    BigInt(data[14]) * 0x1000000n +
    BigInt(data[15]) * 0x10000n +
    BigInt(data[16]) * 0x100n +
    BigInt(data[17]);
  const totalSamplesBig = (BigInt(high4) << 32n) | lowerBits;
  const totalSamples = Number(totalSamplesBig);

  let md5 = "";
  for (let i = 18; i < 34; i++) {
    md5 += data[i].toString(16).padStart(2, "0");
  }

  return {
    minBlockSize,
    maxBlockSize,
    minFrameSize,
    maxFrameSize,
    sampleRate,
    channels,
    bitsPerSample,
    totalSamples,
    md5,
  };
}

function parseVorbisComment(data: Uint8Array): VorbisComment {
  // Vorbis comment block is little-endian (unlike the rest of FLAC, which is big-endian)
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let p = 0;
  const vendorLen = dv.getUint32(p, true);
  p += 4;
  if (p + vendorLen > data.length) {
    throw new FlacParseError("VORBIS_COMMENT vendor length out of range");
  }
  const vendor = utf8Decode(data.subarray(p, p + vendorLen));
  p += vendorLen;

  const commentCount = dv.getUint32(p, true);
  p += 4;

  const tags: VorbisTags = {};
  for (let i = 0; i < commentCount; i++) {
    if (p + 4 > data.length) {
      throw new FlacParseError("VORBIS_COMMENT comment length out of range");
    }
    const len = dv.getUint32(p, true);
    p += 4;
    if (p + len > data.length) {
      throw new FlacParseError("VORBIS_COMMENT comment data out of range");
    }
    const comment = utf8Decode(data.subarray(p, p + len));
    p += len;

    const eq = comment.indexOf("=");
    if (eq < 0) continue;
    const key = comment.slice(0, eq).toUpperCase();
    const value = comment.slice(eq + 1);
    if (!tags[key]) tags[key] = [];
    tags[key].push(value);
  }

  return { vendor, tags };
}

function parsePicture(data: Uint8Array): FlacPicture {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let p = 0;
  const type = dv.getUint32(p, false);
  p += 4;
  const mimeLen = dv.getUint32(p, false);
  p += 4;
  const mimeType = utf8Decode(data.subarray(p, p + mimeLen));
  p += mimeLen;
  const descLen = dv.getUint32(p, false);
  p += 4;
  const description = utf8Decode(data.subarray(p, p + descLen));
  p += descLen;
  const width = dv.getUint32(p, false);
  p += 4;
  const height = dv.getUint32(p, false);
  p += 4;
  const colorDepth = dv.getUint32(p, false);
  p += 4;
  const colorsUsed = dv.getUint32(p, false);
  p += 4;
  const dataLen = dv.getUint32(p, false);
  p += 4;
  const pictureData = copyBytes(data.subarray(p, p + dataLen));

  return {
    type,
    mimeType,
    description,
    width,
    height,
    colorDepth,
    colorsUsed,
    data: pictureData,
  };
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}
