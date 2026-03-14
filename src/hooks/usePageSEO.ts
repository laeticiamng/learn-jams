import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: string;
  ogImage?: string;
}

const BASE_URL = "https://learn-jams.lovable.app";
const SITE_NAME = "COGNITIO";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

export function usePageSEO({
  title,
  description,
  canonical,
  noindex = false,
  ogType = "website",
  ogImage,
}: SEOProps) {
  useEffect(() => {
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

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // Meta description
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
      setLink("canonical", canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`);
    }

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:image", ogImage || DEFAULT_OG_IMAGE, "property");
    if (canonical) {
      setMeta("og:url", canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`, "property");
    }

    // Twitter Card
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", fullTitle, "name");
    setMeta("twitter:description", description, "name");
    setMeta("twitter:image", ogImage || DEFAULT_OG_IMAGE, "name");

    return () => {
      // Cleanup on unmount — restore defaults
      document.title = `${SITE_NAME} — Plateforme d'apprentissage multimodale`;
    };
  }, [title, description, canonical, noindex, ogType, ogImage]);
}
