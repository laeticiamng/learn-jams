import { describe, it, expect } from "vitest";
import { verifyHmacSignature } from "./webhookVerification";

describe("webhookVerification", () => {
  describe("verifyHmacSignature", () => {
    it("rejects empty secret", async () => {
      const result = await verifyHmacSignature("payload", "sig", "");
      expect(result).toBe(false);
    });

    it("rejects empty signature", async () => {
      const result = await verifyHmacSignature("payload", "", "secret");
      expect(result).toBe(false);
    });

    it("verifies valid HMAC-SHA256 signature", async () => {
      const secret = "test-secret-key";
      const payload = '{"event":"test"}';

      // Compute expected signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const signature = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const result = await verifyHmacSignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it("rejects invalid signature", async () => {
      const result = await verifyHmacSignature("payload", "invalid_signature_hex_value_here_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", "secret");
      expect(result).toBe(false);
    });
  });
});
