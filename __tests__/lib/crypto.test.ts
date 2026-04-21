import { describe, it, expect } from "vitest";

// Set env before importing the module
// 32-byte test key (all 0xAA); valid hex, never use in production
process.env.CREDENTIAL_ENCRYPTION_KEY = "aa".repeat(32);

const { encrypt, decrypt } = await import("@/lib/crypto");

describe("crypto", () => {
  it("round-trips a string through encrypt/decrypt", () => {
    const plaintext = JSON.stringify({ token: "secret-refresh-token", expiresAt: 1234567890 });
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext for the same input (random IV)", () => {
    const plaintext = "same-input";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("throws if ciphertext is tampered", () => {
    const ct = encrypt("valid");
    const [iv, tag, enc] = ct.split(":");
    const badTag = tag.slice(0, -2) + (tag.endsWith("00") ? "01" : "00");
    expect(() => decrypt([iv, badTag, enc].join(":"))).toThrow();
  });
});
