import { describe, it, expect, vi } from "vitest";
import { loadDashboard, HISTORY_LIMIT, type DashboardDb } from "./load-dashboard";

const NOW = new Date("2026-09-05T10:00:00Z");

const exam = (id: string, day: string, total: number, listening = 300, reading = 200) => ({
  id,
  submittedAt: new Date(day),
  scores: { parts: { listening, reading }, total },
});

/** Một dòng AttemptAnswer đúng dạng select trong loadDashboard. */
const ans = (section: string, skillTags: string[], isCorrect: boolean | null) => ({
  isCorrect,
  question: { section, skillTags },
});

function fakeDb(exams: unknown[], answers: unknown[]) {
  return {
    attempt: { findMany: vi.fn(async () => exams) },
    attemptAnswer: { findMany: vi.fn(async () => answers) },
    userWord: { count: vi.fn(async () => 0) },
  } as unknown as DashboardDb;
}

describe("loadDashboard", () => {
  it("trả điểm lượt gần nhất và đường tiến bộ từ cũ đến mới", async () => {
    const db = fakeDb(
      [exam("a3", "2026-09-04T00:00:00Z", 700), exam("a2", "2026-09-02T00:00:00Z", 600), exam("a1", "2026-09-01T00:00:00Z", 500)],
      [],
    );
    const d = await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.latest).toEqual({ attemptId: "a3", submittedAt: "2026-09-04T00:00:00.000Z", scores: { parts: { listening: 300, reading: 200 }, total: 700 } });
    expect(d.history.map((h) => h.total)).toEqual([500, 600, 700]);
  });

  it("chưa thi lần nào thì latest là null và history rỗng", async () => {
    const d = await loadDashboard(fakeDb([], []), { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.latest).toBeNull();
    expect(d.history).toEqual([]);
    expect(d.answered).toBe(0);
  });

  it("bỏ qua lượt thi thiếu scores", async () => {
    const db = fakeDb([{ id: "a2", submittedAt: new Date("2026-09-04T00:00:00Z"), scores: null }, exam("a1", "2026-09-01T00:00:00Z", 500)], []);
    const d = await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.latest?.attemptId).toBe("a1");
    expect(d.history).toHaveLength(1);
  });

  it("gắn tên phần thi và đếm số câu đã trả lời", async () => {
    const answers = [
      ans("toeic.p5", ["ngữ pháp"], true),
      ans("toeic.p5", ["ngữ pháp"], false),
      ans("toeic.p7", ["suy luận"], null),
    ];
    const d = await loadDashboard(fakeDb([], answers), { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.bySection).toEqual([{ key: "toeic.p5", name: "Part 5 – Hoàn thành câu", correct: 1, total: 2, rate: 0.5 }]);
    expect(d.answered).toBe(2);
  });

  it("gợi ý ba kỹ năng yếu nhất, kèm phần thi hay gặp nhất của kỹ năng đó", async () => {
    const answers = [
      // "suy luận": 5 câu ở p7, đúng 1 → 20%
      ...Array.from({ length: 5 }, (_, i) => ans("toeic.p7", ["suy luận"], i < 1)),
      // "ngữ pháp": 5 câu ở p5, đúng 4 → 80%
      ...Array.from({ length: 5 }, (_, i) => ans("toeic.p5", ["ngữ pháp"], i < 4)),
      // "từ vựng": chỉ 2 câu → dưới ngưỡng, không được gợi ý
      ans("toeic.p5", ["từ vựng"], false),
      ans("toeic.p5", ["từ vựng"], false),
    ];
    const d = await loadDashboard(fakeDb([], answers), { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.suggestions).toHaveLength(2);
    expect(d.suggestions[0]).toEqual({ tag: "suy luận", section: "toeic.p7", sectionName: "Part 7 – Đọc hiểu", correct: 1, total: 5, rate: 0.2 });
    expect(d.suggestions[1].tag).toBe("ngữ pháp");
  });

  it("chỉ lấy câu của lượt đã nộp trong 30 ngày, và chỉ câu đã chọn đáp án", async () => {
    const db = fakeDb([], []);
    await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    const where = (db.attemptAnswer.findMany as unknown as { mock: { calls: [{ where: Record<string, unknown> }][] } }).mock.calls[0][0].where;
    expect(where).toMatchObject({
      chosen: { not: null },
      attempt: { userId: "u1", certificate: "toeic", submittedAt: { gte: new Date("2026-08-06T10:00:00Z") } },
    });
  });

  it("chỉ lấy lượt thi thử đã nộp của đúng người dùng, mới nhất trước, tối đa HISTORY_LIMIT lượt", async () => {
    const db = fakeDb([], []);
    await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    const call = (
      db.attempt.findMany as unknown as {
        mock: { calls: [{ where: Record<string, unknown>; orderBy: unknown; take: unknown }][] };
      }
    ).mock.calls[0][0];
    expect(call.where).toMatchObject({
      userId: "u1",
      certificate: "toeic",
      type: "EXAM",
      submittedAt: { not: null },
    });
    expect(call.orderBy).toEqual({ submittedAt: "desc" });
    expect(call.take).toBe(HISTORY_LIMIT);
  });
  it("gộp cả số từ vựng đến hạn vào dashboard", async () => {
    const count = vi.fn(async () => 0);
    count.mockResolvedValueOnce(4).mockResolvedValueOnce(30);
    const db = {
      attempt: { findMany: vi.fn(async () => []) },
      attemptAnswer: { findMany: vi.fn(async () => []) },
      userWord: { count },
    };
    const r = await loadDashboard(db as never, { userId: "u1", certificate: "toeic" });
    expect(r.vocab).toEqual({ due: 4, saved: 30 });
  });
});
