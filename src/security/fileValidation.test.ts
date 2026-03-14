import { describe, it, expect } from "vitest";
import { validateFile, sanitizeFilename, FILE_RULES } from "./fileValidation";

describe("fileValidation", () => {
  describe("validateFile", () => {
    it("accepts valid PDF", () => {
      const result = validateFile(
        { name: "course.pdf", type: "application/pdf", size: 1024 },
        "document",
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects invalid MIME type", () => {
      const result = validateFile(
        { name: "malware.exe", type: "application/x-msdownload", size: 1024 },
        "document",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid file type"))).toBe(true);
    });

    it("rejects oversized files", () => {
      const result = validateFile(
        { name: "huge.pdf", type: "application/pdf", size: 100 * 1024 * 1024 },
        "document",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("too large"))).toBe(true);
    });

    it("rejects empty files", () => {
      const result = validateFile(
        { name: "empty.pdf", type: "application/pdf", size: 0 },
        "document",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
    });

    it("rejects wrong extension", () => {
      const result = validateFile(
        { name: "fake.js", type: "application/pdf", size: 1024 },
        "document",
      );
      expect(result.valid).toBe(false);
    });

    it("validates image files", () => {
      expect(validateFile({ name: "photo.jpg", type: "image/jpeg", size: 1024 }, "image").valid).toBe(true);
      expect(validateFile({ name: "photo.bmp", type: "image/bmp", size: 1024 }, "image").valid).toBe(false);
    });

    it("validates audio files", () => {
      expect(validateFile({ name: "song.mp3", type: "audio/mpeg", size: 1024 }, "audio").valid).toBe(true);
    });

    it("validates video files", () => {
      expect(validateFile({ name: "clip.mp4", type: "video/mp4", size: 1024 }, "video").valid).toBe(true);
    });

    it("rejects unknown category", () => {
      const result = validateFile({ name: "a.txt", type: "text/plain", size: 1 }, "unknown" as any);
      expect(result.valid).toBe(false);
    });
  });

  describe("sanitizeFilename", () => {
    it("removes path traversal", () => {
      expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
    });

    it("removes slashes", () => {
      expect(sanitizeFilename("path/to/file.txt")).not.toContain("/");
      expect(sanitizeFilename("path\\to\\file.txt")).not.toContain("\\");
    });

    it("removes null bytes", () => {
      expect(sanitizeFilename("file\0.txt")).not.toContain("\0");
    });

    it("replaces special characters", () => {
      const result = sanitizeFilename("my file (1).pdf");
      expect(result).toMatch(/^[a-zA-Z0-9._-]+$/);
    });

    it("prevents hidden files", () => {
      expect(sanitizeFilename(".htaccess")).not.toMatch(/^\./);
    });

    it("truncates long names", () => {
      const longName = "a".repeat(300) + ".pdf";
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(200);
    });
  });
});
