// ============================================================
// Localized SEO Hook — Multilingual meta tags and hreflang
// ============================================================

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LOCALE_REGISTRY } from "@/i18n/localeRegistry";

interface LocalizedSEOProps {
  titleKey: string;
  descriptionKey: string;
  titleFallback: string;
  descriptionFallback: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: string;
  ogImage?: string;
}

const BASE_URL = "https://learn-jams.lovable.app";
const SITE_NAME = "COGNITIO";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

/**
 * Enhanced SEO hook that generates localized meta tags and hreflang links.
 * Use this for public-facing pages that should be indexed in multiple languages.
 */
export function useLocalizedSEO({
  titleKey,
  descriptionKey,
  titleFallback,
  descriptionFallback,
  canonical,
  noindex = false,
  ogType = "website",
  ogImage,
}: LocalizedSEOProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  useEffect(() => {
    const title = t(titleKey, titleFallback);
    const description = t(descriptionKey, descriptionFallback);
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    document.title = fullTitle;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string, attrs?: Record<string, string>) => {
      const selector = attrs
        ? `link[rel="${rel}"]${Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join("")}`
        : `link[rel="${rel}"]`;
      let el = document.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // Basic meta
    setMeta("description", description);

    // Robots
    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      const robotsEl = document.querySelector('meta[name="robots"]');
      if (robotsEl) robotsEl.remove();
    }

    // Canonical
    if (canonical) {
      const canonicalUrl = canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`;
      setLink("canonical", canonicalUrl);
    }

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:image", ogImage ?? DEFAULT_OG_IMAGE, "property");
    setMeta("og:locale", currentLang, "property");
    if (canonical) {
      setMeta("og:url", canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`, "property");
    }

    // Twitter Card
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", fullTitle, "name");
    setMeta("twitter:description", description, "name");
    setMeta("twitter:image", ogImage ?? DEFAULT_OG_IMAGE, "name");

    // hreflang alternate links for all supported locales
    // Remove old hreflang links
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    if (canonical && !noindex) {
      const basePath = canonical.startsWith("http") ? new URL(canonical).pathname : canonical;
      for (const locale of LOCALE_REGISTRY) {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", locale.htmlLang);
        link.setAttribute("href", `${BASE_URL}${basePath}?lang=${locale.code}`);
        document.head.appendChild(link);
      }
      // x-default
      const defaultLink = document.createElement("link");
      defaultLink.setAttribute("rel", "alternate");
      defaultLink.setAttribute("hreflang", "x-default");
      defaultLink.setAttribute("href", `${BASE_URL}${basePath}`);
      document.head.appendChild(defaultLink);
    }

    return () => {
      document.title = `${SITE_NAME} — Multimodal Learning Platform`;
      // Clean up hreflang links
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    };
  }, [titleKey, descriptionKey, titleFallback, descriptionFallback, canonical, noindex, ogType, ogImage, t, currentLang]);
}
