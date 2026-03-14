// ============================================================
// RTL Layout Wrapper — Applies RTL-specific CSS adjustments
// ============================================================

import { useTranslation } from "react-i18next";
import { isRTL } from "@/i18n/direction";
import type { ReactNode } from "react";

interface RTLLayoutWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps children with RTL-aware styles.
 * Adds `rtl` class and `dir="rtl"` when the current language is RTL.
 * Use this for components that need explicit RTL awareness beyond
 * what the global `dir` attribute provides.
 */
export default function RTLLayoutWrapper({ children, className = "" }: RTLLayoutWrapperProps) {
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={`${rtl ? "rtl-layout" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
