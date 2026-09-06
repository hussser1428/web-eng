import { describe, it, expect, vi } from "vitest";
import { listExams } from "./list-exams";

type Row = { id: string; title: string; status: "DRAFT" | "PUBLISHED"; createdAt: Date; _count: { questions: number } };

function fakeDb(rows: Row[]) {
  const findMany = vi.fn<(a: unknown) => Promise<Row[]>>(async () => rows);
  return { db: { exam: { findMany } } as never, findMany };
}

describe("listExams", () => {
  it("trả về số câu của từng đề", async () => {
    const { db } = fakeDb([
      { id: "e1", title: "Đề 1", status: "PUBLISHED", createdAt: new Date("2026-09-02"), _count: { questions: 200 } },
      { id: "e2", title: "Đề 2", status: "DRAFT", createdAt: new Date("2026-09-01"), _count: { questions: 0 } },
    ]);

    const r = await listExams(db);

    expect(r).toEqual([
      { id: "e1", title: "Đề 1", status: "PUBLISHED", questionCount: 200, createdAt: new Date("2026-09-02") },
      { id: "e2", title: "Đề 2", status: "DRAFT", questionCount: 0, createdAt: new Date("2026-09-01") },
    ]);
  });

  it("xếp đề mới tạo lên trước", async () => {
    const { db, findMany } = fakeDb([]);

    await listExams(db);

    const args = findMany.mock.calls[0][0] as { orderBy: unknown };
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });
});
