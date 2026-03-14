// ============================================================
// Storage Paths — Secure bucket & path management
// ============================================================

import { sanitizeFilename } from "./fileValidation";

export const BUCKETS = {
  uploads: { name: "uploads", public: false, description: "User document uploads" },
  audio: { name: "audio", public: false, description: "Generated audio files" },
  images: { name: "images", public: false, description: "Generated images and covers" },
  video: { name: "video", public: false, description: "Generated video files" },
  exports: { name: "exports", public: false, description: "Premium exports" },
} as const;

export type BucketKey = keyof typeof BUCKETS;

/**
 * Build a secure storage path for a user file.
 * Format: {userId}/{category}/{timestamp}_{sanitized_filename}
 */
export function buildStoragePath(
  userId: string,
  category: string,
  filename: string,
): string {
  if (!userId || userId.length < 10) throw new Error("Invalid userId for storage path");

  const safe = sanitizeFilename(filename);
  const timestamp = Date.now();
  return `${userId}/${category}/${timestamp}_${safe}`;
}

/**
 * Validate that a storage path belongs to the expected user.
 * Prevents path traversal attacks.
 */
export function validateStoragePath(path: string, expectedUserId: string): boolean {
  if (!path || !expectedUserId) return false;
  // Must start with userId/
  if (!path.startsWith(`${expectedUserId}/`)) return false;
  // No path traversal
  if (path.includes("..") || path.includes("//")) return false;
  // No null bytes
  if (path.includes("\0")) return false;
  return true;
}

/**
 * Generate a signed URL expiry time.
 */
export function getSignedUrlExpiry(type: "short" | "medium" | "long"): number {
  switch (type) {
    case "short": return 300; // 5 minutes
    case "medium": return 3600; // 1 hour
    case "long": return 86400; // 24 hours
  }
}
