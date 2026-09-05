// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, saveMock, submitMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string } } | null> => ({ user: { id: "u1" } })),
  saveMock: vi.fn(async () => ({ saved: 1 })),
  submitMock: vi.fn(async () => ({ correct: 1, total: 2, scores: null, overtime: false })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/attempts/save-exam-answers", () => ({ saveExamAnswers: saveMock }));
vi.mock("@/features/attempts/submit", () => ({ submitAttempt: submitMock }));

import { POST } from "./route";

const params = Promise.resolve({ attemptId: "a1" });
function req(body?: unknown) {
  return new Request("http://x/api/attempts/a1/submit", { method: "POST", body: body === undefined ? null : JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}
function reqRaw(rawBody: string) {
  return new Request("http://x/api/attempts/a1/submit", { method: "POST", body: rawBody, headers: { "Content-Type": "application/json" } });
}

describe("POST /api/attempts/[attemptId]/submit", () => {
  it("không body → chỉ nộp", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(saveMock).not.toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledWith({}, { attemptId: "a1", userId: "u1" });
  });

  it("có answers → lưu trước rồi nộp", async () => {
    const res = await POST(req({ answers: [{ questionId: "q1", chosen: 2 }] }), { params });
    expect(res.status).toBe(200);
    expect(saveMock).toHaveBeenCalledWith({}, { attemptId: "a1", userId: "u1", answers: [{ questionId: "q1", chosen: 2 }] });
    expect(submitMock).toHaveBeenCalled();
  });

  it("ALREADY_SUBMITTED → 409", async () => {
    submitMock.mockRejectedValueOnce(new Error("ALREADY_SUBMITTED"));
    expect((await POST(req(), { params })).status).toBe(409);
  });

  it("chưa đăng nhập → 401", async () => {
    authMock.mockResolvedValueOnce(null);
    expect((await POST(req(), { params })).status).toBe(401);
  });

  it("body không phải JSON → 400 INVALID", async () => {
    const res = await POST(reqRaw("not json"), { params });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });
});
