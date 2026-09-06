import { describe, it, expect, vi } from "vitest";
import { countDueWords } from "./count-due";

type CountArgs = { where: Record<string, unknown> };

const NOW = new Date("2026-09-05T00:00:00.000Z");

describe("countDueWords", () => {
  it("đếm riêng số từ đến hạn và tổng số từ đã lưu", async () => {
    const count = vi.fn<(args: CountArgs) => Promise<number>>(async () => 0);
    count.mockResolvedValueOnce(3).mockResolvedValueOnce(11);
    const r = await countDueWords({ userWord: { count } } as never, { userId: "u1", now: NOW });

    expect(r).toEqual({ due: 3, saved: 11 });
    expect(count.mock.calls[0][0].where).toEqual({ userId: "u1", dueAt: { lte: NOW } });
    expect(count.mock.calls[1][0].where).toEqual({ userId: "u1" });
  });
});
