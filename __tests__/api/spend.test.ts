import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    spendRecord: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { GET } from "@/app/api/spend/route";

const mockAuth = vi.mocked(auth);

describe("GET /api/spend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "admin@co.com", role: "finance", department: null, name: "Fin", image: null },
      expires: "",
    } as never);
  });

  it("returns 403 if not logged in", async () => {
    mockAuth.mockResolvedValueOnce(null as never);
    const response = await GET(new Request("http://localhost/api/spend"));
    expect(response.status).toBe(403);
  });

  it("returns 200 for finance role", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.spendRecord.findMany).mockResolvedValue([] as never);
    const response = await GET(new Request("http://localhost/api/spend"));
    expect(response.status).toBe(200);
  });
});
