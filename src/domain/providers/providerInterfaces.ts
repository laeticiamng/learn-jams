// ============================================================
// Provider Interfaces — 12 provider contracts
// ============================================================

// ── Auth Provider ──────────────────────────────────────────

export interface AuthProvider {
  readonly key: string;
  signUp(email: string, password: string, metadata?: Record<string, string>): Promise<{ userId: string }>;
  signIn(email: string, password: string): Promise<{ userId: string; token: string }>;
  signOut(token: string): Promise<void>;
  getUser(token: string): Promise<{ userId: string; email: string } | null>;
}

// ── Storage Provider ───────────────────────────────────────

export interface StorageProvider {
  readonly key: string;
  upload(bucket: string, path: string, data: Blob | ArrayBuffer, contentType?: string): Promise<{ publicUrl: string }>;
  download(bucket: string, path: string): Promise<ArrayBuffer>;
  getPublicUrl(bucket: string, path: string): string;
  remove(bucket: string, paths: string[]): Promise<void>;
}

// ── LLM Provider ───────────────────────────────────────────

export interface LLMProvider {
  readonly key: string;
  generateText(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  generateStructured<T>(prompt: string, schema: Record<string, unknown>, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
}

export interface LLMResponse {
  text: string;
  usage?: { input_tokens: number; output_tokens: number };
  model?: string;
}

// ── Image Provider ─────────────────────────────────────────

export interface ImageProvider {
  readonly key: string;
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult>;
}

export interface ImageOptions {
  size?: string;
  quality?: "standard" | "hd";
  style?: string;
  n?: number;
}

export interface ImageResult {
  images: Array<{ url?: string; base64?: string }>;
}

// ── Video Provider ─────────────────────────────────────────

export interface VideoProvider {
  readonly key: string;
  generateVideo(prompt: string, options?: VideoOptions): Promise<VideoResult>;
  getVideoStatus(generationId: string): Promise<VideoStatusResult>;
}

export interface VideoOptions {
  duration_sec?: number;
  resolution?: string;
  aspect_ratio?: string;
  style?: string;
  model?: string;
}

export interface VideoResult {
  generation_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
}

export interface VideoStatusResult {
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  error?: string;
  progress_percent?: number;
}

// ── TTS Provider ───────────────────────────────────────────

export interface TTSProvider {
  readonly key: string;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  format?: "mp3" | "wav" | "opus";
  language?: string;
}

export interface TTSResult {
  audio_data: ArrayBuffer;
  duration_sec?: number;
  format: string;
}

// ── Music Provider ─────────────────────────────────────────

export interface MusicProvider {
  readonly key: string;
  generateMusic(input: MusicGenerationInput): Promise<MusicResult>;
  getStatus(taskId: string): Promise<MusicStatusResult>;
}

export interface MusicGenerationInput {
  title: string;
  lyrics: string;
  style: string;
  instrumental?: boolean;
  callback_url?: string;
}

export interface MusicResult {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  audio_url?: string;
}

export interface MusicStatusResult {
  status: "pending" | "processing" | "completed" | "failed";
  audio_url?: string;
  cover_image_url?: string;
  duration_sec?: number;
  error?: string;
}

// ── Billing Provider ───────────────────────────────────────

export interface BillingProvider {
  readonly key: string;
  createCheckoutSession(input: CheckoutInput): Promise<{ checkout_url: string; session_id: string }>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ portal_url: string }>;
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export interface CheckoutInput {
  price_id: string;
  customer_email?: string;
  customer_id?: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

// ── Email Provider ─────────────────────────────────────────

export interface EmailProvider {
  readonly key: string;
  sendEmail(input: EmailInput): Promise<EmailResult>;
}

export interface EmailInput {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailResult {
  id: string;
  status: "sent" | "queued" | "failed";
}

// ── SMS Provider ───────────────────────────────────────────

export interface SMSProvider {
  readonly key: string;
  sendSMS(input: SMSInput): Promise<SMSResult>;
}

export interface SMSInput {
  to: string;
  body: string;
  from?: string;
  status_callback_url?: string;
}

export interface SMSResult {
  message_sid: string;
  status: "queued" | "sent" | "delivered" | "failed";
}

// ── Monitoring Provider ────────────────────────────────────

export interface MonitoringProvider {
  readonly key: string;
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: "info" | "warning" | "error"): void;
  setUser(user: { id: string; email?: string }): void;
  startTransaction(name: string, op?: string): MonitoringTransaction;
}

export interface MonitoringTransaction {
  finish(): void;
  setStatus(status: string): void;
}

// ── Analytics Provider ─────────────────────────────────────

export interface AnalyticsProvider {
  readonly key: string;
  identify(userId: string, properties?: Record<string, unknown>): void;
  track(event: string, properties?: Record<string, unknown>): void;
  getFeatureFlag(flagKey: string, defaultValue?: boolean): boolean;
  isFeatureEnabled(flagKey: string): boolean;
}
