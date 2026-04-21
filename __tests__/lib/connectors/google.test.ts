import { describe, it, expect } from "vitest";
import { extractDomainFromUrl } from "@/lib/connectors/google";

describe("extractDomainFromUrl", () => {
  it("extracts domain from a full URL", () => {
    expect(extractDomainFromUrl("https://notion.so/oauth")).toBe("notion.so");
  });
  it("returns the input if it looks like a domain already", () => {
    expect(extractDomainFromUrl("github.com")).toBe("github.com");
  });
  it("handles URLs with paths and query params", () => {
    expect(extractDomainFromUrl("https://app.hubspot.com/oauth/authorize?client_id=123")).toBe("app.hubspot.com");
  });
  it("returns null for blank or invalid input", () => {
    expect(extractDomainFromUrl("")).toBeNull();
    expect(extractDomainFromUrl("not-a-url")).toBeNull();
  });
});
