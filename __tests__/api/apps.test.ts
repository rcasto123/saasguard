import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    app: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { GET } from "@/app/api/apps/route";

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(db.app.findMany);

describe("GET /api/apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "admin@co.com", role: "admin", department: null, name: "Admin", image: null },
      expires: "",
    } as never);
  });

  it("returns 403 if not logged in", async () => {
    mockAuth.mockResolvedValueOnce(null as never);
    const response = await GET(new Request("http://localhost/api/apps"));
    expect(response.status).toBe(403);
  });

  it("calls findMany and returns apps", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "a1", name: "Notion", domain: "notion.so", status: "shadow", riskScore: 60 },
    ] as never);
    const response = await GET(new Request("http://localhost/api/apps"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Notion");
  });
});
