// ============================================================
// File Validation — Upload security rules
// ============================================================

export interface FileValidationRule {
  category: string;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeBytes: number;
  description: string;
}

export const FILE_RULES: Record<string, FileValidationRule> = {
  document: {
    category: "document",
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ],
    allowedExtensions: [".pdf", ".docx", ".txt", ".md"],
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    description: "Course documents (PDF, DOCX, TXT, MD)",
  },
  audio: {
    category: "audio",
    allowedMimeTypes: [
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac",
      "audio/x-m4a", "audio/mp4",
    ],
    allowedExtensions: [".mp3", ".wav", ".ogg", ".aac", ".m4a"],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    description: "Audio files",
  },
  image: {
    category: "image",
    allowedMimeTypes: [
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    description: "Images",
  },
  video: {
    category: "video",
    allowedMimeTypes: [
      "video/mp4", "video/webm", "video/quicktime",
    ],
    allowedExtensions: [".mp4", ".webm", ".mov"],
    maxSizeBytes: 200 * 1024 * 1024, // 200MB
    description: "Video files",
  },
};

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a file against the rules for its category.
 */
export function validateFile(
  file: { name: string; type: string; size: number },
  category: keyof typeof FILE_RULES,
): FileValidationResult {
  const rule = FILE_RULES[category];
  if (!rule) return { valid: false, errors: [`Unknown file category: ${category}`] };

  const errors: string[] = [];

  // Check MIME type
  if (!rule.allowedMimeTypes.includes(file.type)) {
    errors.push(`Invalid file type: ${file.type}. Allowed: ${rule.allowedMimeTypes.join(", ")}`);
  }

  // Check extension
  const ext = getExtension(file.name);
  if (!rule.allowedExtensions.includes(ext)) {
    errors.push(`Invalid file extension: ${ext}. Allowed: ${rule.allowedExtensions.join(", ")}`);
  }

  // Check size
  if (file.size > rule.maxSizeBytes) {
    const maxMB = Math.round(rule.maxSizeBytes / (1024 * 1024));
    errors.push(`File too large: ${Math.round(file.size / (1024 * 1024))}MB. Maximum: ${maxMB}MB`);
  }

  // Check for empty files
  if (file.size === 0) {
    errors.push("File is empty");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize a filename for safe storage.
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal
  let safe = filename.replace(/\.\./g, "").replace(/[\/\\]/g, "");
  // Remove null bytes
  safe = safe.replace(/\0/g, "");
  // Replace special chars with underscores
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Limit length
  if (safe.length > 200) {
    const ext = getExtension(safe);
    safe = safe.substring(0, 200 - ext.length) + ext;
  }
  // Ensure it doesn't start with a dot (hidden file)
  if (safe.startsWith(".")) safe = "_" + safe;
  return safe;
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot).toLowerCase();
}
