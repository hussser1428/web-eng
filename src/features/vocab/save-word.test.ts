import { describe, it, expect, vi } from "vitest";
import { saveWord } from "./save-word";

type UpsertArgs = {
  where: { userId_wordId: { userId: string; wordId: string } };
  update: Record<string, never>;
  create: { userId: string; wordId: string; sourceContext: string | null };
};

describe("saveWord", () => {
  it("tạo mới khi chưa có", async () => {
    const db = {
      userWord: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn<(args: UpsertArgs) => Promise<unknown>>().mockResolvedValue({}),
      },
    };
    const r = await saveWord(db as never, { userId: "u", wordId: "w", sourceContext: "x".repeat(400) });
    expect(r).toEqual({ created: true });
    const call = db.userWord.upsert.mock.calls[0][0];
    expect(call.update).toEqual({});
    expect(call.create.sourceContext?.length).toBe(300);
    expect(call.create.userId).toBe("u");
  });

  it("đã có thì không tạo lại nhưng vẫn upsert (không đụng tiến độ SM-2 vì update rỗng)", async () => {
    const db = {
      userWord: {
        findUnique: vi.fn(async () => ({ id: "uw" })),
        upsert: vi.fn<(args: UpsertArgs) => Promise<unknown>>().mockResolvedValue({}),
      },
    };
    const r = await saveWord(db as never, { userId: "u", wordId: "w" });
    expect(r).toEqual({ created: false });
    const call = db.userWord.upsert.mock.calls[0][0];
    expect(call.update).toEqual({});
  });
});
