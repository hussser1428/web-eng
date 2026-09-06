import { describe, it, expect, vi } from "vitest";
import { countQuestions } from "./count-questions";

type GroupByArgs = { where: { certificate: string } };
type GroupByRow = { section: string; status: "DRAFT" | "PUBLISHED"; _count: { _all: number } };

function fakeDb(rows: GroupByRow[]) {
  const groupBy = vi.fn<(args: GroupByArgs) => Promise<GroupByRow[]>>(async () => rows);
  return { db: { question: { groupBy } } as never, groupBy };
}

describe("countQuestions", () => {
  it("liệt kê đủ mọi section của chứng chỉ, kể cả section chưa có câu nào", async () => {
    const { db } = fakeDb([]);
    const r = await countQuestions(db);

    const p1 = r.find((x) => x.section === "toeic.p1");
    expect(p1).toEqual({ section: "toeic.p1", name: "Part 1 – Mô tả tranh", required: 6, draft: 0, published: 0 });
    expect(r).toHaveLength(7);
  });

  it("gộp đúng số câu nháp và đã đăng theo từng section", async () => {
    const { db } = fakeDb([
      { section: "toeic.p5", status: "DRAFT", _count: { _all: 3 } },
      { section: "toeic.p5", status: "PUBLISHED", _count: { _all: 20 } },
      { section: "toeic.p6", status: "PUBLISHED", _count: { _all: 16 } },
    ]);
    const r = await countQuestions(db);

    expect(r.find((x) => x.section === "toeic.p5")).toEqual({
      section: "toeic.p5",
      name: "Part 5 – Hoàn thành câu",
      required: 30,
      draft: 3,
      published: 20,
    });
    expect(r.find((x) => x.section === "toeic.p6")).toEqual({
      section: "toeic.p6",
      name: "Part 6 – Hoàn thành đoạn văn",
      required: 16,
      draft: 0,
      published: 16,
    });
  });

  it("bỏ qua section lạ không có trong CertificateSpec", async () => {
    const { db } = fakeDb([{ section: "toeic.unknown", status: "PUBLISHED", _count: { _all: 5 } }]);
    const r = await countQuestions(db);

    expect(r.some((x) => x.section === "toeic.unknown")).toBe(false);
    expect(r).toHaveLength(7);
  });

  it("truyền certificate xuống where của groupBy", async () => {
    const { db, groupBy } = fakeDb([]);
    await countQuestions(db, "toeic");

    expect(groupBy.mock.calls[0][0].where).toEqual({ certificate: "toeic" });
  });
});
