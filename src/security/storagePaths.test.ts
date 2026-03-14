import { describe, it, expect } from "vitest";
import { buildStoragePath, validateStoragePath, getSignedUrlExpiry } from "./storagePaths";

describe("storagePaths", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  describe("buildStoragePath", () => {
    it("builds path with userId prefix", () => {
      const path = buildStoragePath(userId, "documents", "course.pdf");
      expect(path).toMatch(new RegExp(`^${userId}/documents/\\d+_course\\.pdf$`));
    });

    it("sanitizes filename in path", () => {
      const path = buildStoragePath(userId, "documents", "../../etc/passwd");
      expect(path).not.toContain("..");
    });

    it("throws for invalid userId", () => {
      expect(() => buildStoragePath("", "docs", "file.pdf")).toThrow();
      expect(() => buildStoragePath("short", "docs", "file.pdf")).toThrow();
    });
  });

  describe("validateStoragePath", () => {
    it("accepts valid paths", () => {
      expect(validateStoragePath(`${userId}/documents/file.pdf`, userId)).toBe(true);
    });

    it("rejects path traversal", () => {
      expect(validateStoragePath(`${userId}/../other/file`, userId)).toBe(false);
    });

    it("rejects wrong user prefix", () => {
      expect(validateStoragePath("other-user/documents/file.pdf", userId)).toBe(false);
    });

    it("rejects null bytes", () => {
      expect(validateStoragePath(`${userId}/docs/file\0.pdf`, userId)).toBe(false);
    });

    it("rejects double slashes", () => {
      expect(validateStoragePath(`${userId}//docs/file.pdf`, userId)).toBe(false);
    });
  });

  describe("getSignedUrlExpiry", () => {
    it("returns correct durations", () => {
      expect(getSignedUrlExpiry("short")).toBe(300);
      expect(getSignedUrlExpiry("medium")).toBe(3600);
      expect(getSignedUrlExpiry("long")).toBe(86400);
    });
  });
});
