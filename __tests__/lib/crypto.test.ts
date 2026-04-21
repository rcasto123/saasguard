import { describe, it, expect } from "vitest";

// Set env before importing the module
process.env.CREDENTIAL_ENCRYPTION_KEY = "a".repeat(64); // 32 bytes as hex

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
    const ciphertext = encrypt("valid");
    const tampered = ciphertext.slice(0, -4) + "0000";
    expect(() => decrypt(tampered)).toThrow();
  });
});
