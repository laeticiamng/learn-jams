// ============================================================
// Content Sanitizer — XSS prevention for rendered content
// ============================================================

/**
 * HTML entities that must be escaped to prevent XSS.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const HTML_ESCAPE_RE = /[&<>"'\/`]/g;

/**
 * Escape HTML entities in a string to prevent XSS.
 */
export function escapeHtml(input: string): string {
  return input.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize generated content for safe rendering.
 * Strips dangerous tags but preserves safe markdown-like formatting.
 */
export function sanitizeGeneratedContent(input: string): string {
  let result = input;

  // Remove script tags and their content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, onload, etc.)
  result = result.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");
  result = result.replace(/\bon\w+\s*=\s*\S+/gi, "");

  // Remove javascript: URLs
  result = result.replace(/javascript\s*:/gi, "");

  // Remove data: URLs (can contain scripts)
  result = result.replace(/data\s*:[^;]*;base64/gi, "data:blocked;base64");

  // Remove iframe, embed, object tags
  result = result.replace(/<(iframe|embed|object|applet|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  result = result.replace(/<(iframe|embed|object|applet|form)\b[^>]*\/?>/gi, "");

  // Remove style tags with expressions
  result = result.replace(/expression\s*\(/gi, "");
  result = result.replace(/url\s*\(\s*["']?\s*javascript/gi, "");

  return result;
}

/**
 * Sanitize a URL for safe use in links.
 * Only allows http:, https:, and mailto: protocols.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // Relative URLs are fine
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
  }
  return "#";
}

/**
 * Validate a redirect URL is safe (same-origin or whitelisted).
 */
export function isSafeRedirect(url: string, allowedOrigins: string[]): boolean {
  if (!url) return false;

  // Relative paths are safe
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

/**
 * Sanitize markdown content for safe rendering.
 * Removes potentially dangerous HTML embedded in markdown.
 */
export function sanitizeMarkdown(input: string): string {
  return sanitizeGeneratedContent(input);
}
