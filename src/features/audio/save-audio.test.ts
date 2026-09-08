import { describe, it, expect, vi } from "vitest";
import { saveAudio } from "./save-audio";

function fakeDb() {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "a1", ...data }));
  return { audioFile: { create } } as unknown as Parameters<typeof saveAudio>[0];
}

describe("saveAudio", () => {
  it("lưu bytes và trả về id kèm url tương đối", async () => {
    const db = fakeDb();
    const bytes = new Uint8Array([1, 2, 3]);
    const r = await saveAudio(db, bytes);
    expect(r).toEqual({ id: "a1", url: "/api/audio/a1" });
  });

  it("ném EMPTY khi bytes rỗng", async () => {
    const db = fakeDb();
    await expect(saveAudio(db, new Uint8Array())).rejects.toThrow("EMPTY");
  });
});
