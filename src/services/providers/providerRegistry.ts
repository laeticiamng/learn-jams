// ============================================================
// Provider Registry — Central provider registration
// ============================================================

import type { ProviderDomain } from "@/domain/providers/provider.types";
import type {
  AuthProvider, StorageProvider, LLMProvider, ImageProvider,
  VideoProvider, TTSProvider, MusicProvider, BillingProvider,
  EmailProvider, SMSProvider, MonitoringProvider, AnalyticsProvider,
} from "@/domain/providers/providerInterfaces";

// Union of all provider types
export type AnyProvider =
  | AuthProvider | StorageProvider | LLMProvider | ImageProvider
  | VideoProvider | TTSProvider | MusicProvider | BillingProvider
  | EmailProvider | SMSProvider | MonitoringProvider | AnalyticsProvider;

// Registry stores all registered providers by key
const registry = new Map<string, AnyProvider>();

export function registerProvider(provider: AnyProvider): void {
  registry.set(provider.key, provider);
}

export function getProvider<T extends AnyProvider>(key: string): T | null {
  return (registry.get(key) as T) ?? null;
}

export function getAllProviderKeys(): string[] {
  return Array.from(registry.keys());
}

export function hasProvider(key: string): boolean {
  return registry.has(key);
}

// ── Domain-typed getters ───────────────────────────────────

export function getAuthProvider(key: string): AuthProvider | null {
  return getProvider<AuthProvider>(key);
}

export function getStorageProvider(key: string): StorageProvider | null {
  return getProvider<StorageProvider>(key);
}

export function getLLMProvider(key: string): LLMProvider | null {
  return getProvider<LLMProvider>(key);
}

export function getImageProvider(key: string): ImageProvider | null {
  return getProvider<ImageProvider>(key);
}

export function getVideoProvider(key: string): VideoProvider | null {
  return getProvider<VideoProvider>(key);
}

export function getTTSProvider(key: string): TTSProvider | null {
  return getProvider<TTSProvider>(key);
}

export function getMusicProvider(key: string): MusicProvider | null {
  return getProvider<MusicProvider>(key);
}

export function getBillingProvider(key: string): BillingProvider | null {
  return getProvider<BillingProvider>(key);
}

export function getEmailProvider(key: string): EmailProvider | null {
  return getProvider<EmailProvider>(key);
}

export function getSMSProvider(key: string): SMSProvider | null {
  return getProvider<SMSProvider>(key);
}

export function getMonitoringProvider(key: string): MonitoringProvider | null {
  return getProvider<MonitoringProvider>(key);
}

export function getAnalyticsProvider(key: string): AnalyticsProvider | null {
  return getProvider<AnalyticsProvider>(key);
}

// ── Bootstrap ──────────────────────────────────────────────

import { supabaseAuthProvider } from "./supabaseAuthProvider";
import { supabaseStorageProvider } from "./supabaseStorageProvider";
import { openaiLlmProvider } from "./openaiLlmProvider";
import { openaiImageProvider } from "./openaiImageProvider";
import { openaiVideoProvider } from "./openaiVideoProvider";
import { openaiTtsProvider } from "./openaiTtsProvider";
import { sunoMusicProvider } from "./sunoMusicProvider";
import { stripeBillingProvider } from "./stripeBillingProvider";
import { resendEmailProvider } from "./resendEmailProvider";
import { twilioSmsProvider } from "./twilioSmsProvider";
import { sentryMonitoringProvider } from "./sentryMonitoringProvider";
import { posthogAnalyticsProvider } from "./posthogAnalyticsProvider";

let bootstrapped = false;

export function bootstrapProviders(): void {
  if (bootstrapped) return;
  registerProvider(supabaseAuthProvider);
  registerProvider(supabaseStorageProvider);
  registerProvider(openaiLlmProvider);
  registerProvider(openaiImageProvider);
  registerProvider(openaiVideoProvider);
  registerProvider(openaiTtsProvider);
  registerProvider(sunoMusicProvider);
  registerProvider(stripeBillingProvider);
  registerProvider(resendEmailProvider);
  registerProvider(twilioSmsProvider);
  registerProvider(sentryMonitoringProvider);
  registerProvider(posthogAnalyticsProvider);
  bootstrapped = true;
}
