// ============================================================
// Provider Router — Domain-based routing with failover
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ProviderDomain, ProviderRoute, ProviderRouteRules,
  ProviderRecord, ProviderResolutionResult, ResolvedProvider,
  ProviderHealth, ProviderHealthStatus, DEFAULT_RETRY_POLICY,
} from "@/domain/providers/provider.types";
import { hasProvider, type AnyProvider, getProvider } from "./providerRegistry";

// ── Route Cache ────────────────────────────────────────────

let routeCache: Map<ProviderDomain, ProviderRoute> | null = null;
let providerCache: Map<string, ProviderRecord> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadRoutes(): Promise<Map<ProviderDomain, ProviderRoute>> {
  const now = Date.now();
  if (routeCache && now - cacheTimestamp < CACHE_TTL_MS) return routeCache;

  const { data, error } = await supabase
    .from("provider_routes")
    .select("*");

  if (error || !data) return routeCache ?? new Map();

  const map = new Map<ProviderDomain, ProviderRoute>();
  for (const row of data) {
    map.set(row.domain as ProviderDomain, row as unknown as ProviderRoute);
  }
  routeCache = map;
  cacheTimestamp = now;
  return map;
}

async function loadProviders(): Promise<Map<string, ProviderRecord>> {
  if (providerCache) return providerCache;

  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("enabled", true);

  if (error || !data) return providerCache ?? new Map();

  const map = new Map<string, ProviderRecord>();
  for (const row of data) {
    map.set(row.provider_key, row as unknown as ProviderRecord);
  }
  providerCache = map;
  return map;
}

// ── Resolution ─────────────────────────────────────────────

export async function resolveProvider(domain: ProviderDomain): Promise<ProviderResolutionResult | null> {
  const routes = await loadRoutes();
  const providers = await loadProviders();

  const route = routes.get(domain);
  if (!route) return null;

  const preferredRecord = providers.get(route.preferred_provider_key);
  const preferredRegistered = hasProvider(route.preferred_provider_key);

  if (preferredRecord?.enabled && preferredRegistered) {
    return {
      domain,
      resolved: {
        provider_key: route.preferred_provider_key,
        provider_type: preferredRecord.provider_type as any,
        is_fallback: false,
        config_json: preferredRecord.config_json,
      },
      fallback_available: !!route.fallback_provider_key && hasProvider(route.fallback_provider_key),
      route_rules: route.rules_json as ProviderRouteRules,
    };
  }

  // Try fallback
  if (route.fallback_provider_key) {
    const fallbackRecord = providers.get(route.fallback_provider_key);
    const fallbackRegistered = hasProvider(route.fallback_provider_key);

    if (fallbackRecord?.enabled && fallbackRegistered) {
      return {
        domain,
        resolved: {
          provider_key: route.fallback_provider_key,
          provider_type: fallbackRecord.provider_type as any,
          is_fallback: true,
          config_json: fallbackRecord.config_json,
        },
        fallback_available: false,
        route_rules: route.rules_json as ProviderRouteRules,
      };
    }
  }

  return null;
}

// ── Execute with Failover ──────────────────────────────────

export async function executeWithFailover<T>(
  domain: ProviderDomain,
  execute: (providerKey: string) => Promise<T>,
): Promise<{ result: T; provider_key: string; is_fallback: boolean }> {
  const resolution = await resolveProvider(domain);
  if (!resolution) throw new Error(`No provider available for domain: ${domain}`);

  try {
    const result = await execute(resolution.resolved.provider_key);
    return {
      result,
      provider_key: resolution.resolved.provider_key,
      is_fallback: resolution.resolved.is_fallback,
    };
  } catch (primaryError: unknown) {
    // If already on fallback, re-throw
    if (resolution.resolved.is_fallback || !resolution.fallback_available) {
      throw primaryError;
    }

    // Try fallback
    const routes = await loadRoutes();
    const route = routes.get(domain);
    if (!route?.fallback_provider_key) throw primaryError;

    try {
      const result = await execute(route.fallback_provider_key);
      return {
        result,
        provider_key: route.fallback_provider_key,
        is_fallback: true,
      };
    } catch (fallbackError: unknown) {
      // Both failed — throw primary error with context
      const primaryMessage = primaryError instanceof Error ? primaryError.message : "Internal error";
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Internal error";
      throw new Error(
        `Provider failover exhausted for ${domain}. Primary: ${primaryMessage}. Fallback: ${fallbackMessage}`,
      );
    }
  }
}

// ── Cache Management ───────────────────────────────────────

export function invalidateRouteCache(): void {
  routeCache = null;
  providerCache = null;
  cacheTimestamp = 0;
}
