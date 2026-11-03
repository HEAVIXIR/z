import { describe, it, expect } from "vitest";
import {
  detectImageType,
  detectImage,
  validateImageBuffer,
  sanitizeFilename,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-security";

/* ============================================================
   Unit tests for src/lib/upload-security.ts (P0-7, P1-20)
   HEAVIX-SECURITY-BASELINE-V1.md §7  (Upload hardening)
   HEAVIX-P0-IMPLEMENTATION-PLAN.md   STEP 6 (Upload Pipeline)
   ------------------------------------------------------------
   Verifies:
     • detectImageType correctly identifies JPEG/PNG/GIF/WebP/BMP
       by their magic bytes (NEVER trusting the client MIME).
     • detectImageType returns null for non-image bytes.
     • detectImageType returns null for too-short buffers (<12).
     • validateImageBuffer rejects oversized buffers.
     • validateImageBuffer accepts valid image buffers.
     • validateImageBuffer rejects empty buffers.
     • sanitizeFilename produces a safe, opaque, lowercase-ext name.
   ============================================================ */

/* ── Magic-byte constants ── */
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const GIF87_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const GIF89_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const BMP_MAGIC = Buffer.from([0x42, 0x4d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

describe("detectImageType magic-byte sniffing", () => {
  it("identifies JPEG", () => {
    expect(detectImageType(JPEG_MAGIC)).toBe("jpeg");
  });

  it("identifies PNG", () => {
    expect(detectImageType(PNG_MAGIC)).toBe("png");
  });

  it("identifies GIF87a", () => {
    expect(detectImageType(GIF87_MAGIC)).toBe("gif");
  });

  it("identifies GIF89a", () => {
    expect(detectImageType(GIF89_MAGIC)).toBe("gif");
  });

  it("identifies WebP (RIFF…WEBP)", () => {
    expect(detectImageType(WEBP_MAGIC)).toBe("webp");
  });

  it("identifies BMP (BM)", () => {
    expect(detectImageType(BMP_MAGIC)).toBe("bmp");
  });

  it("returns null for non-image bytes", () => {
    // SVG (text-based, must NEVER be detected as a safe image)
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`);
    expect(detectImageType(svg)).toBeNull();

    // Random text
    expect(detectImageType(Buffer.from("hello world!"))).toBeNull();

    // PDF magic
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x0a, 0x0a, 0x0a]);
    expect(detectImageType(pdf)).toBeNull();

    // EXE / PE
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectImageType(exe)).toBeNull();
  });

  it("returns null for buffers shorter than 12 bytes", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    expect(detectImageType(Buffer.from([]))).toBeNull();
    expect(detectImageType(Buffer.alloc(11, 0))).toBeNull();
  });
});

describe("detectImage (combined descriptor)", () => {
  it("returns {type, ext, mime} for JPEG", () => {
    const d = detectImage(JPEG_MAGIC);
    expect(d).toEqual({ type: "jpeg", ext: "jpg", mime: "image/jpeg" });
  });

  it("returns null for non-image bytes", () => {
    expect(detectImage(Buffer.from("not an image!"))).toBeNull();
  });
});

describe("validateImageBuffer size + magic gate", () => {
  it("accepts a valid JPEG buffer", () => {
    const r = validateImageBuffer(JPEG_MAGIC);
    expect(r.ok).toBe(true);
    expect(r.type).toBe("jpeg");
    expect(r.ext).toBe("jpg");
    expect(r.mime).toBe("image/jpeg");
    expect(r.error).toBeUndefined();
  });

  it("rejects an empty buffer", () => {
    const r = validateImageBuffer(Buffer.alloc(0));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/خالی/);
  });

  it("rejects an oversized buffer (>5 MB)", () => {
    // Build a buffer that starts with the JPEG magic but is too big.
    const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0);
    JPEG_MAGIC.copy(oversized, 0);
    const r = validateImageBuffer(oversized);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/حجم/);
  });

  it("rejects a non-image buffer with Persian error", () => {
    const r = validateImageBuffer(Buffer.from("not an image at all!!"));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/فرمت/);
  });

  it("rejects an SVG (XSS vector) even though its MIME would be image/svg+xml", () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
    );
    const r = validateImageBuffer(svg);
    expect(r.ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("produces a safe opaque filename with the given lowercase extension", () => {
    const name = sanitizeFilename("JPG");
    // Format: <base36-timestamp>-<24-hex>.jpg
    expect(name).toMatch(/^[a-z0-9]+-[a-f0-9]{24}\.jpg$/);
  });

  it("strips non-alphanumeric characters from the extension", () => {
    const name = sanitizeFilename("J.P.G");
    expect(name.endsWith(".jpg")).toBe(true);
    expect(name).toMatch(/^[a-z0-9]+-[a-f0-9]{24}\.jpg$/);
  });

  it("produces a filename with no extension when ext is empty", () => {
    const name = sanitizeFilename("");
    expect(name).toMatch(/^[a-z0-9]+-[a-f0-9]{24}$/);
    expect(name.includes(".")).toBe(false);
  });

  it("produces DIFFERENT filenames on successive calls (randomness)", () => {
    const a = sanitizeFilename("png");
    const b = sanitizeFilename("png");
    expect(a).not.toBe(b);
  });
});
