// ============================================================
// Direction Utilities — RTL/LTR support
// ============================================================

import { getDirection, isRTL as checkRTL } from "./localeRegistry";

/**
 * Apply dir and lang attributes to the document root element.
 */
export function applyDocumentDirection(locale: string): void {
  const dir = getDirection(locale);
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", locale);
}

/**
 * Returns CSS logical properties helpers for the current locale.
 * Use these instead of left/right for RTL-safe layouts.
 */
export function getLogicalProps(locale: string) {
  const rtl = checkRTL(locale);
  return {
    isRTL: rtl,
    startSide: rtl ? "right" : "left",
    endSide: rtl ? "left" : "right",
    marginStart: rtl ? "marginRight" : "marginLeft",
    marginEnd: rtl ? "marginLeft" : "marginRight",
    paddingStart: rtl ? "paddingRight" : "paddingLeft",
    paddingEnd: rtl ? "paddingLeft" : "paddingRight",
    textAlign: rtl ? ("right" as const) : ("left" as const),
  } as const;
}

export { isRTL } from "./localeRegistry";
