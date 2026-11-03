/* ============================================================
   HEAVIX — Upload Security helpers (P0-7)
   ------------------------------------------------------------
   Implements the first three gates of the HEAVIX-P0-IMPLEMENTATION-PLAN
   §STEP 6 upload pipeline:

       Size  →  Magic bytes  →  (Decode)  →  Malware scan  →
       EXIF sanitize  →  Resize/WebP/AVIF  →  Storage  →  URL

   This module covers:
     • `detectImageType()`      — magic-bytes sniffing (NEVER trust MIME).
     • `sanitizeFilename()`     — random, opaque safe filename.
     • `validateImageBuffer()`  — combined size + magic-bytes gate.

   The client-supplied `file.type` and original filename are NEVER
   trusted; both are replaced server-side.

   Magic-byte signatures:
     JPEG   FF D8 FF
     PNG    89 50 4E 47 0D 0A 1A 0A
     GIF    47 49 46 38 (37 a | 39 a)        → "GIF87a" / "GIF89a"
     WebP   52 49 46 46 ?? ?? ?? ?? 57 45 42 50   (RIFF…WEBP)
     BMP    42 4D
   ============================================================ */

export type ImageType = "jpeg" | "png" | "gif" | "webp" | "bmp";

export interface DetectedImage {
  type: ImageType;
  /** Correct extension for the detected type (lowercase, no dot). */
  ext: string;
  /** MIME mapped from magic bytes (NOT from the client). */
  mime: string;
}

const EXT_BY_TYPE: Record<ImageType, string> = {
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
  bmp: "bmp",
};

const MIME_BY_TYPE: Record<ImageType, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/** Maximum upload size — 5 MB. Enforced in `validateImageBuffer`. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/* ── Magic-byte sniffing ────────────────────────────────────── */

/**
 * Detect the image format of `buffer` by inspecting its leading
 * bytes. Returns `null` if the buffer does not match any known
 * image signature. This is the ONLY source of truth for the
 * detected type — `file.type` from the client is ignored.
 */
export function detectImageType(buffer: Buffer): ImageType | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    buffer[0] === 0x47 && // G
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x38 && // 8
    (buffer[4] === 0x37 || buffer[4] === 0x39) && // 7 or 9
    buffer[5] === 0x61 // a
  ) {
    return "gif";
  }

  // BMP: "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "bmp";
  }

  // WebP: "RIFF"...."WEBP"
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "webp";
  }

  return null;
}

/** Convenience: detect type and return the full descriptor. */
export function detectImage(buffer: Buffer): DetectedImage | null {
  const type = detectImageType(buffer);
  if (!type) return null;
  return { type, ext: EXT_BY_TYPE[type], mime: MIME_BY_TYPE[type] };
}

/* ── Filename sanitisation ──────────────────────────────────── */

/**
 * Generate a safe, random, opaque filename.
 *
 * The original user-supplied filename is NEVER used on disk — it
 * can carry path traversal segments, weird unicode, attacker-controlled
 * extensions, EXIF-leaking camera model names, etc. Instead we mint
 * a fresh `cuid`-like identifier and append the server-derived
 * extension. The returned string contains only `[a-z0-9]` and a
 * single dot — safe to embed in any URL or filesystem path.
 *
 * Note: we use `crypto.randomBytes` for the random component (24 hex
 * chars = 96 bits of entropy) plus a millisecond timestamp prefix to
 * keep filenames lexically sortable by creation time.
 */
export function sanitizeFilename(ext: string): string {
  const safeExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  // 24 hex chars from 12 random bytes.
  const rand = randomHex(12);
  const ts = Date.now().toString(36);
  return `${ts}-${rand}${safeExt ? "." + safeExt : ""}`;
}

/** Generate `bytes` random bytes as a lowercase hex string. */
function randomHex(bytes: number): string {
  // Use the Node global crypto — works in the Next.js node runtime.
  const c = globalThis.crypto as unknown as {
    randomBytes?: (n: number) => Buffer;
    getRandomValues?: (arr: Uint8Array) => Uint8Array;
  };
  if (typeof c?.randomBytes === "function") {
    return c.randomBytes(bytes).toString("hex");
  }
  // Fallback (Web Crypto) — slower but correct.
  const arr = new Uint8Array(bytes);
  c?.getRandomValues?.(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ── Combined validation ────────────────────────────────────── */

export interface UploadValidation {
  ok: boolean;
  type?: ImageType;
  ext?: string;
  mime?: string;
  error?: string;
}

/**
 * Combined size + magic-bytes gate. Callers should pass the FULL
 * uploaded buffer (after `arrayBuffer()`/`Buffer.from(...)`).
 *
 * On success: `{ ok: true, type, ext, mime }`.
 * On failure: `{ ok: false, error }` with a Persian message suitable
 * for surfacing to the user.
 */
export function validateImageBuffer(buffer: Buffer): UploadValidation {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: "فایل خالی است." };
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `حجم فایل بیش از ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} مگابایت است.`,
    };
  }
  const detected = detectImage(buffer);
  if (!detected) {
    return {
      ok: false,
      error: "فرمت فایل پشتیبانی نمی‌شود. فقط JPG، PNG، GIF، WebP، BMP.",
    };
  }
  return {
    ok: true,
    type: detected.type,
    ext: detected.ext,
    mime: detected.mime,
  };
}

/* ── EXIF sanitisation ──────────────────────────────────────── */

/**
 * Best-effort EXIF-strip log helper.
 *
 * Full EXIF stripping requires decoding the JPEG APP1 marker and
 * re-encoding the image (e.g. with `sharp` or `jpeg-js`). That work
 * is tracked separately; for now we log the recommendation so the
 * security event is auditable per HEAVIX-SECURITY-BASELINE-V1 §10
 * ("upload rejection" / "suspicious activity").
 *
 * Call this from the upload route when a JPEG is accepted. It does
 * NOT mutate the buffer — it is a marker for the audit log until
 * the decode-and-re-encode pipeline lands (P1).
 */
export function logExifSanitizationRecommendation(
  type: ImageType,
  bytes: number,
): void {
  if (type !== "jpeg") return;
  console.warn(
    `[upload-security] JPEG accepted (${bytes} bytes) — EXIF metadata NOT stripped. ` +
      `TODO(P1): re-encode via sharp({ jpeg: true }) or strip APP1 marker before persisting. ` +
      `Recommended by HEAVIX-SECURITY-BASELINE-V1 §7 (file security) and STEP 6 of P0-IMPLEMENTATION-PLAN.`,
  );
}
