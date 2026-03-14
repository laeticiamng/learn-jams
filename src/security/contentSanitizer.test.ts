import { describe, it, expect } from "vitest";
import { escapeHtml, stripHtml, sanitizeGeneratedContent, sanitizeUrl, isSafeRedirect } from "./contentSanitizer";

describe("contentSanitizer", () => {
  describe("escapeHtml", () => {
    it("escapes angle brackets", () => {
      expect(escapeHtml("<script>alert(1)</script>")).not.toContain("<script>");
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("escapes quotes", () => {
      expect(escapeHtml('"test"')).toBe("&quot;test&quot;");
    });

    it("escapes ampersand", () => {
      expect(escapeHtml("a & b")).toBe("a &amp; b");
    });
  });

  describe("stripHtml", () => {
    it("removes all HTML tags", () => {
      expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
    });
  });

  describe("sanitizeGeneratedContent", () => {
    it("removes script tags", () => {
      const input = "Hello <script>alert(1)</script> World";
      expect(sanitizeGeneratedContent(input)).toBe("Hello  World");
    });

    it("removes event handlers", () => {
      const input = '<img src="x" onerror="alert(1)">';
      expect(sanitizeGeneratedContent(input)).not.toContain("onerror");
    });

    it("removes javascript: URLs", () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      expect(sanitizeGeneratedContent(input)).not.toContain("javascript:");
    });

    it("removes iframes", () => {
      const input = '<iframe src="evil.com"></iframe>';
      expect(sanitizeGeneratedContent(input)).not.toContain("<iframe");
    });

    it("preserves safe content", () => {
      const input = "This is a normal paragraph with **bold** text.";
      expect(sanitizeGeneratedContent(input)).toBe(input);
    });
  });

  describe("sanitizeUrl", () => {
    it("allows https URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("allows http URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("allows mailto URLs", () => {
      expect(sanitizeUrl("mailto:test@example.com")).toBe("mailto:test@example.com");
    });

    it("blocks javascript: URLs", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
    });

    it("blocks data: URLs", () => {
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
    });

    it("allows relative paths", () => {
      expect(sanitizeUrl("/pricing")).toBe("/pricing");
    });

    it("blocks protocol-relative URLs", () => {
      expect(sanitizeUrl("//evil.com")).toBe("#");
    });
  });

  describe("isSafeRedirect", () => {
    const allowed = ["https://learn-jams.lovable.app"];

    it("allows relative paths", () => {
      expect(isSafeRedirect("/library", allowed)).toBe(true);
    });

    it("allows same-origin URLs", () => {
      expect(isSafeRedirect("https://learn-jams.lovable.app/pricing", allowed)).toBe(true);
    });

    it("blocks external URLs", () => {
      expect(isSafeRedirect("https://evil.com/steal", allowed)).toBe(false);
    });

    it("blocks protocol-relative URLs", () => {
      expect(isSafeRedirect("//evil.com", allowed)).toBe(false);
    });

    it("blocks empty URLs", () => {
      expect(isSafeRedirect("", allowed)).toBe(false);
    });
  });
});
