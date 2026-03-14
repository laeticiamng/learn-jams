// ============================================================
// Zone Resolver — Maps country to pricing zone
// ============================================================

import type { ZoneKey } from "@/domain/billing/pricing.types";

const ZONE_A_COUNTRIES = new Set([
  "FR", "DE", "GB", "US", "CA", "AU", "JP", "KR", "CH", "AT", "BE", "NL",
  "LU", "IE", "IT", "ES", "PT", "FI", "SE", "NO", "DK", "IS",
]);

const ZONE_B_COUNTRIES = new Set([
  "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "LT", "LV", "EE",
  "TR", "SA", "AE", "QA", "KW", "BH", "OM", "MX", "BR", "AR", "CL", "CO",
]);

const ZONE_C_COUNTRIES = new Set([
  "IN", "BD", "PK", "LK", "NP", "NG", "KE", "GH", "TZ", "UG", "ET",
  "EG", "MA", "TN", "DZ", "PH", "VN", "ID", "TH", "MM",
]);

export function resolveZone(countryCode: string): ZoneKey {
  const cc = countryCode.toUpperCase();
  if (ZONE_A_COUNTRIES.has(cc)) return "zone_a";
  if (ZONE_B_COUNTRIES.has(cc)) return "zone_b";
  if (ZONE_C_COUNTRIES.has(cc)) return "zone_c";
  return "zone_a"; // Default to full price for unknown countries
}

export function getZoneMultiplier(zone: ZoneKey): number {
  switch (zone) {
    case "zone_a": return 1.00;
    case "zone_b": return 0.75;
    case "zone_c": return 0.55;
  }
}

export function getLocalCurrency(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  const CURRENCY_MAP: Record<string, string> = {
    US: "USD", CA: "CAD", GB: "GBP", CH: "CHF", JP: "JPY", KR: "KRW",
    AU: "AUD", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
    HU: "HUF", RO: "RON", BG: "BGN", TR: "TRY", BR: "BRL", MX: "MXN",
    AR: "ARS", CL: "CLP", CO: "COP", IN: "INR", BD: "BDT", PK: "PKR",
    NG: "NGN", KE: "KES", EG: "EGP", MA: "MAD", TN: "TND", PH: "PHP",
    VN: "VND", ID: "IDR", TH: "THB", SA: "SAR", AE: "AED", QA: "QAR",
  };
  return CURRENCY_MAP[cc] ?? "EUR";
}
