import { describe, it, expect, vi } from "vitest";
import { saveWord } from "./save-word";

describe("saveWord", () => {
  it("tạo mới khi chưa có", async () => {
    const db = {
      userWord: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({})),
      },
    };
    const r = await saveWord(db as never, { userId: "u", wordId: "w", sourceContext: "x".repeat(400) });
    expect(r).toEqual({ created: true });
    const data = db.userWord.create.mock.calls[0][0].data;
    expect(data.sourceContext.length).toBe(300);
    expect(data.userId).toBe("u");
  });

  it("đã có thì không tạo lại", async () => {
    const db = {
      userWord: {
        findUnique: vi.fn(async () => ({ id: "uw" })),
        create: vi.fn(),
      },
    };
    const r = await saveWord(db as never, { userId: "u", wordId: "w" });
    expect(r).toEqual({ created: false });
    expect(db.userWord.create).not.toHaveBeenCalled();
  });
});
