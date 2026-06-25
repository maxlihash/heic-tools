// convert.js — server-side HEIC conversion core.
// Shared by the HTTP API and the MCP server. libheif via heic-convert (pure JS).
import convert from "heic-convert";

const FORMATS = {
  jpg: { format: "JPEG", mime: "image/jpeg", ext: "jpg" },
  jpeg: { format: "JPEG", mime: "image/jpeg", ext: "jpg" },
  png: { format: "PNG", mime: "image/png", ext: "png" },
};

export function resolveFormat(to) {
  const key = String(to || "jpg").toLowerCase();
  const f = FORMATS[key];
  if (!f) {
    const allowed = Object.keys(FORMATS).join(", ");
    throw new Error(`Unsupported target format "${to}". Allowed: ${allowed}`);
  }
  return f;
}

/**
 * Convert a HEIC/HEIF buffer to JPEG or PNG.
 * @param {Buffer} buffer  raw HEIC/HEIF bytes
 * @param {string} to      "jpg" | "jpeg" | "png"
 * @param {number} quality 0..1 (JPEG only)
 * @returns {Promise<{buffer: Buffer, mime: string, ext: string}>}
 */
export async function convertHeic(buffer, to = "jpg", quality = 0.92) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Empty input buffer");
  }
  const f = resolveFormat(to);
  const q = Math.min(1, Math.max(0.1, Number(quality) || 0.92));
  const out = await convert({
    buffer,
    format: f.format,
    quality: f.format === "JPEG" ? q : undefined,
  });
  return { buffer: Buffer.from(out), mime: f.mime, ext: f.ext };
}
