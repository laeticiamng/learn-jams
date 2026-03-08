import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "a", "br", "ul", "ol", "li", "p", "span"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}
