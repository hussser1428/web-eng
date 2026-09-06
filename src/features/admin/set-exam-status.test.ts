import { describe, it, expect, vi } from "vitest";
import { setExamStatus } from "./set-exam-status";

function fakeDb() {
  const update = vi.fn(async () => ({}));
  return { db: { exam: { update } } as never, update };
}

describe("setExamStatus", () => {
  it("đổi trạng thái đúng đề", async () => {
    const { db, update } = fakeDb();

    await setExamStatus(db, { id: "e1", status: "PUBLISHED" });

    expect(update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { status: "PUBLISHED" } });
  });
});
