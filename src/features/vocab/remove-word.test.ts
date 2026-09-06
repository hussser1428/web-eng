import { describe, it, expect, vi } from "vitest";
import { removeUserWord } from "./remove-word";

type DeleteManyArgs = { where: Record<string, unknown> };

describe("removeUserWord", () => {
  it("xoá đúng từ của đúng người dùng", async () => {
    const deleteMany = vi.fn<(args: DeleteManyArgs) => Promise<{ count: number }>>(async () => ({ count: 1 }));
    const r = await removeUserWord({ userWord: { deleteMany } } as never, { userId: "u1", wordId: "w1" });

    expect(r).toEqual({ removed: true });
    const args = deleteMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1", wordId: "w1" });
  });

  it("không có dòng nào khớp thì removed false", async () => {
    const deleteMany = vi.fn<(args: DeleteManyArgs) => Promise<{ count: number }>>(async () => ({ count: 0 }));
    const r = await removeUserWord({ userWord: { deleteMany } } as never, { userId: "u1", wordId: "khong-co" });
    expect(r).toEqual({ removed: false });
  });
});
