// ============================================================
// CSP & Security Headers — Frontend security configuration
// ============================================================

/**
 * Content Security Policy directives.
 */
export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'"], // unsafe-inline only in dev via getDevServerHeaders()
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
  "media-src": ["'self'", "blob:", "https://*.supabase.co"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
    "https://checkout.stripe.com",
  ],
  "frame-src": ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": [],
} as const;

/**
 * Build CSP header string from directives.
 */
export function buildCspHeader(overrides: Partial<Record<string, string[]>> = {}): string {
  const directives = { ...CSP_DIRECTIVES, ...overrides };
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

/**
 * All recommended security headers for the application.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": buildCspHeader(),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0", // Modern browsers use CSP instead; this header can cause issues
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

/**
 * Apply security headers to a Vite dev server config.
 * Usage in vite.config.ts:
 *   server: { headers: getDevServerHeaders() }
 */
export function getDevServerHeaders(): Record<string, string> {
  // Relax CSP for dev (HMR needs eval/inline)
  const devCsp = buildCspHeader({
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "connect-src": [
      "'self'",
      "ws://localhost:*",
      "http://localhost:*",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.stripe.com",
    ],
  });

  return {
    ...SECURITY_HEADERS,
    "Content-Security-Policy": devCsp,
    "Strict-Transport-Security": "", // No HSTS in dev
  };
}

/**
 * Security meta tags to inject in index.html.
 */
export const SECURITY_META_TAGS = [
  '<meta http-equiv="X-Content-Type-Options" content="nosniff">',
  '<meta http-equiv="X-Frame-Options" content="DENY">',
  '<meta name="referrer" content="strict-origin-when-cross-origin">',
];
