import { describe, it, expect, vi } from "vitest";
import { listQuestions } from "./list-questions";

type Row = {
  id: string;
  section: string;
  status: "DRAFT" | "PUBLISHED";
  source: "AI" | "IMPORT" | "MANUAL";
  stem: string | null;
  answer: number;
  choices: unknown;
  audioUrl: string | null;
  groupId: string | null;
  updatedAt: Date;
  group: { audioUrl: string | null } | null;
};

function row(p: Partial<Row> = {}): Row {
  return {
    id: "q1",
    section: "toeic.p5",
    status: "DRAFT",
    source: "AI",
    stem: "The report ___ yesterday.",
    answer: 1,
    choices: ["a", "b", "c", "d"],
    audioUrl: null,
    groupId: null,
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    group: null,
    ...p,
  };
}

type FindManyArgs = { where: Record<string, unknown>; skip: number; take: number };

function fakeDb(rows: Row[], total = rows.length) {
  const findMany = vi.fn<(args: FindManyArgs) => Promise<Row[]>>(async () => rows);
  const count = vi.fn<(args: { where: Record<string, unknown> }) => Promise<number>>(async () => total);
  return { db: { question: { findMany, count } } as never, findMany, count };
}

describe("listQuestions", () => {
  it("mặc định lấy trang 1 với 50 câu, không lọc gì ngoài chứng chỉ", async () => {
    const { db, findMany, count } = fakeDb([], 0);
    const r = await listQuestions(db, {});

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ certificate: "toeic" });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50);
    expect(count.mock.calls[0][0]).toEqual({ where: { certificate: "toeic" } });
    expect(r).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
  });

  it("lọc theo section, trạng thái và nguồn", async () => {
    const { db, findMany } = fakeDb([]);
    await listQuestions(db, { section: "toeic.p2", status: "PUBLISHED", source: "IMPORT" });

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      certificate: "toeic",
      section: "toeic.p2",
      status: "PUBLISHED",
      source: "IMPORT",
    });
  });

  it("tìm q trong stem không phân biệt hoa thường", async () => {
    const { db, findMany } = fakeDb([]);
    await listQuestions(db, { q: "  Report  " });

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ certificate: "toeic", stem: { contains: "Report", mode: "insensitive" } });
  });

  it("phân trang bằng skip/take đúng", async () => {
    const { db, findMany } = fakeDb([], 120);
    const r = await listQuestions(db, { page: 3, pageSize: 20 });

    const args = findMany.mock.calls[0][0];
    expect(args.skip).toBe(40);
    expect(args.take).toBe(20);
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(20);
    expect(r.total).toBe(120);
  });

  it("hasAudio đúng khi câu có audio, khi nhóm có audio và khi không có gì", async () => {
    const { db } = fakeDb([
      row({ id: "cau-co-audio", audioUrl: "/a.mp3" }),
      row({ id: "nhom-co-audio", groupId: "g1", group: { audioUrl: "/g.mp3" } }),
      row({ id: "khong-co", groupId: "g2", group: { audioUrl: null } }),
    ]);
    const r = await listQuestions(db, {});

    expect(r.items.map((x) => [x.id, x.hasAudio])).toEqual([
      ["cau-co-audio", true],
      ["nhom-co-audio", true],
      ["khong-co", false],
    ]);
  });

  it("trả đủ trường của một dòng, choices là mảng chuỗi", async () => {
    const { db } = fakeDb([row({ groupId: "g9", group: { audioUrl: null } })]);
    const r = await listQuestions(db, {});

    expect(r.items[0]).toEqual({
      id: "q1",
      section: "toeic.p5",
      status: "DRAFT",
      source: "AI",
      stem: "The report ___ yesterday.",
      answer: 1,
      choices: ["a", "b", "c", "d"],
      hasAudio: false,
      groupId: "g9",
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    });
  });
});
