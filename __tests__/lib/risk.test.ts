import { describe, it, expect } from "vitest";
import { calculateRiskScore } from "@/lib/risk";

describe("calculateRiskScore", () => {
  it("returns 20 baseline for an app with no recognized scopes", () => {
    expect(calculateRiskScore(["openid", "email"])).toBe(20);
  });

  it("adds 25 for each high-risk scope, capped at 100", () => {
    const score = calculateRiskScore([
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/contacts",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/admin.directory.user",
    ]);
    expect(score).toBe(100);
  });

  it("adds 10 for medium-risk scopes", () => {
    const score = calculateRiskScore([
      "https://www.googleapis.com/auth/calendar.readonly",
    ]);
    expect(score).toBe(30);
  });

  it("stacks medium and high risk scopes", () => {
    const score = calculateRiskScore([
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
    ]);
    expect(score).toBe(55);
  });

  it("handles empty scopes", () => {
    expect(calculateRiskScore([])).toBe(20);
  });
});
