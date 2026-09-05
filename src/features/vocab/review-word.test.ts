import { describe, it, expect, vi } from "vitest";
import { reviewWord } from "./review-word";
import { QUALITY } from "./sm2";

const NOW = new Date("2026-09-05T00:00:00.000Z");
const NGAY = 24 * 60 * 60 * 1000;

type FindUniqueArgs = {
  where: { userId_wordId: { userId: string; wordId: string } };
  select: Record<string, unknown>;
};

type UpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

function fakeDb(row: Record<string, unknown> | null) {
  return {
    userWord: {
      findUnique: vi.fn<(args: FindUniqueArgs) => Promise<typeof row>>(async () => row),
      update: vi.fn<(args: UpdateArgs) => Promise<unknown>>(async () => ({})),
    },
  };
}

describe("reviewWord", () => {
  it("từ đến hạn, trả lời dễ thì hẹn lại sau 1 ngày và ghi lại tiến độ", async () => {
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: new Date(NOW.getTime() - NGAY) });

    const r = await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.EASY, now: NOW });

    expect(r.early).toBe(false);
    expect(r.intervalDays).toBe(1);
    expect(r.dueAt.toISOString()).toBe(new Date(NOW.getTime() + NGAY).toISOString());
    const args = db.userWord.update.mock.calls[0][0] as { where: { id: string }; data: Record<string, unknown> };
    expect(args.where.id).toBe("uw1");
    expect(args.data).toMatchObject({ intervalDays: 1, repetitions: 1 });
    expect(args.data.dueAt).toEqual(r.dueAt);
  });

  it("ôn sớm mà trả lời đúng thì lịch không bị đẩy xa hơn lịch cũ", async () => {
    const cu = new Date(NOW.getTime() + 30 * NGAY);
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 20, repetitions: 3, dueAt: cu });

    const r = await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.EASY, now: NOW });

    // SM-2 tính ra hơn 50 ngày, nhưng ôn sớm nên giữ nguyên mốc cũ 30 ngày
    expect(r.intervalDays).toBeGreaterThan(30);
    expect(r.early).toBe(true);
    expect(r.dueAt.toISOString()).toBe(cu.toISOString());
  });

  it("ôn sớm mà quên thì vẫn kéo từ về ôn lại ngày mai", async () => {
    const cu = new Date(NOW.getTime() + 30 * NGAY);
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 20, repetitions: 3, dueAt: cu });

    const r = await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.FORGOT, now: NOW });

    expect(r.dueAt.toISOString()).toBe(new Date(NOW.getTime() + NGAY).toISOString());
  });

  it("người dùng chưa lưu từ này thì ném NOT_FOUND và không ghi gì", async () => {
    const db = fakeDb(null);
    await expect(reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.EASY, now: NOW })).rejects.toThrow("NOT_FOUND");
    expect(db.userWord.update).not.toHaveBeenCalled();
  });

  it("tìm đúng bản ghi theo cặp người dùng và từ", async () => {
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: NOW });
    await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.HARD, now: NOW });
    const args = db.userWord.findUnique.mock.calls[0][0] as { where: { userId_wordId: { userId: string; wordId: string } } };
    expect(args.where.userId_wordId).toEqual({ userId: "u1", wordId: "w1" });
  });
});
