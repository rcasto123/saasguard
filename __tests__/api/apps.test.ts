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
import { PATCH } from "@/app/api/apps/[id]/route";

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(db.app.findMany);
const mockFindUnique = vi.mocked(db.app.findUnique);
const mockUpdate = vi.mocked(db.app.update);

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

describe("PATCH /api/apps/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "admin@co.com", role: "admin", department: null, name: "Admin", image: null },
      expires: "",
    } as never);
  });

  it("returns 403 if not admin", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "u2", email: "mgr@co.com", role: "manager", department: "Eng", name: "Mgr", image: null },
      expires: "",
    } as never);
    const response = await PATCH(
      new Request("http://localhost/api/apps/a1", { method: "PATCH", body: JSON.stringify({ status: "managed" }) }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(response.status).toBe(403);
  });

  it("rejects invalid status transitions", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "a1", status: "managed" } as never);
    const response = await PATCH(
      new Request("http://localhost/api/apps/a1", { method: "PATCH", body: JSON.stringify({ status: "shadow" }) }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(response.status).toBe(400);
  });

  it("transitions shadow → managed", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "a1", status: "shadow" } as never);
    mockUpdate.mockResolvedValueOnce({ id: "a1", name: "Notion", status: "managed", category: null, riskScore: 50 } as never);
    const response = await PATCH(
      new Request("http://localhost/api/apps/a1", { method: "PATCH", body: JSON.stringify({ status: "managed" }) }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("managed");
  });
});
