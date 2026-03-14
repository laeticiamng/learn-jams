import { describe, it, expect } from "vitest";
import { redactSecrets, redactObject, safeStringify } from "./secretRedaction";

describe("secretRedaction", () => {
  describe("redactSecrets", () => {
    it("redacts Stripe live keys", () => {
      const input = "Key is sk-live-abc123def456ghi789jkl0123456789";
      expect(redactSecrets(input)).not.toContain("sk-live");
      expect(redactSecrets(input)).toContain("[REDACTED]");
    });

    it("redacts OpenAI keys", () => {
      const input = "sk-abcdefghij1234567890abcdefghij";
      expect(redactSecrets(input)).toContain("[REDACTED]");
    });

    it("redacts JWTs", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      expect(redactSecrets(jwt)).toContain("[REDACTED]");
    });

    it("preserves non-secret strings", () => {
      const input = "Hello world, user_id=abc-123";
      expect(redactSecrets(input)).toBe(input);
    });
  });

  describe("redactObject", () => {
    it("redacts sensitive field names", () => {
      const obj = { name: "test", password: "secret123", api_key: "sk-test" };
      const result = redactObject(obj);
      expect(result.name).toBe("test");
      expect(result.password).toBe("[REDACTED]");
      expect(result.api_key).toBe("[REDACTED]");
    });

    it("handles nested objects", () => {
      const obj = { config: { stripe_secret_key: "sk-live-xxx" } };
      const result = redactObject(obj);
      expect((result.config as any).stripe_secret_key).toBe("[REDACTED]");
    });

    it("redacts string values containing secrets", () => {
      const obj = { log: "Connected with sk-abcdefghij1234567890abcdefghij" };
      const result = redactObject(obj);
      expect(result.log).toContain("[REDACTED]");
    });
  });

  describe("safeStringify", () => {
    it("returns redacted JSON string", () => {
      const obj = { token: "secret", data: "safe" };
      const result = safeStringify(obj);
      expect(result).toContain("[REDACTED]");
      expect(result).toContain("safe");
    });

    it("handles string input", () => {
      expect(safeStringify("sk-abcdefghij1234567890abcdefghij")).toContain("[REDACTED]");
    });
  });
});
