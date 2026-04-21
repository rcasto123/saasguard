import { describe, it, expect } from "vitest";
import { merchantToDomain, parseCSVTransactions } from "@/lib/connectors/cardfeed";

describe("merchantToDomain", () => {
  it("matches known merchants", () => {
    expect(merchantToDomain("GITHUB*SUBSCRIPTION")).toBe("github.com");
    expect(merchantToDomain("FIGMA INC")).toBe("figma.com");
    expect(merchantToDomain("SLACK TECHNOLOGIES")).toBe("slack.com");
  });
  it("returns null for unknown merchants", () => {
    expect(merchantToDomain("COFFEE SHOP")).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(merchantToDomain("Notion Labs")).toBe("notion.so");
  });
});

describe("parseCSVTransactions", () => {
  it("parses a valid CSV string", () => {
    const csv = `date,merchant,amount,currency,cardholder email
2026-04-01,GitHub,49.00,USD,alice@company.com
2026-04-02,Figma,45.00,USD,bob@company.com`;
    const result = parseCSVTransactions(csv);
    expect(result).toHaveLength(2);
    expect(result[0].merchantName).toBe("GitHub");
    expect(result[0].amount).toBe(49);
    expect(result[0].cardholderEmail).toBe("alice@company.com");
    expect(result[1].currency).toBe("USD");
  });
  it("handles missing cardholder email", () => {
    const csv = `date,merchant,amount,currency,cardholder email
2026-04-01,Slack,10.00,USD,`;
    const result = parseCSVTransactions(csv);
    expect(result[0].cardholderEmail).toBeNull();
  });
});
