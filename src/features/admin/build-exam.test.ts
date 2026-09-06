import { describe, it, expect, vi } from "vitest";
import { buildExam } from "./build-exam";

type Row = { id: string; groupId: string | null; createdAt: Date };

/** Số câu mỗi phần theo `CertificateSpec` của TOEIC. */
const CAN: Record<string, number> = {
  "toeic.p1": 6,
  "toeic.p2": 25,
  "toeic.p3": 39,
  "toeic.p4": 30,
  "toeic.p5": 30,
  "toeic.p6": 16,
  "toeic.p7": 54,
};
const TONG = Object.values(CAN).reduce((a, b) => a + b, 0);

let dem = 0;
function cau(section: string, groupId: string | null = null): Row {
  dem += 1;
  return { id: `${section}#${dem}`, groupId, createdAt: new Date(2026, 0, 1, 0, 0, dem) };
}

/** Kho câu đủ đúng số lượng mọi phần; `thay` ghi đè kho của một vài phần. */
function kho(thay: Record<string, Row[]> = {}): Record<string, Row[]> {
  const k: Record<string, Row[]> = {};
  for (const [s, n] of Object.entries(CAN)) k[s] = Array.from({ length: n }, () => cau(s));
  return { ...k, ...thay };
}

function nhom(section: string, key: string, coSize: number): Row[] {
  return Array.from({ length: coSize }, () => cau(section, key));
}

type FindManyArgs = { where: { section: string }; orderBy: unknown };
type CreateManyArgs = { data: Array<{ examId: string; questionId: string; order: number }> };

function fakeDb(k: Record<string, Row[]>) {
  const findMany = vi.fn<(a: FindManyArgs) => Promise<Row[]>>(async (a) => k[a.where.section] ?? []);
  const create = vi.fn(async () => ({ id: "e1" }));
  const createMany = vi.fn<(a: CreateManyArgs) => Promise<{ count: number }>>(async () => ({ count: 0 }));
  return { db: { question: { findMany }, exam: { create }, examQuestion: { createMany } } as never, findMany, create, createMany };
}

/** Bộ sinh số giả lập cố định để khoá kết quả xáo trộn. */
function hatGiong(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function dsCauHoi(createMany: ReturnType<typeof fakeDb>["createMany"]): string[] {
  return createMany.mock.calls[0][0].data.map((d) => d.questionId);
}

describe("buildExam", () => {
  it("lấy nguyên nhóm Part 3, không cắt nhóm", async () => {
    // 14 nhóm 3 câu = 42 câu, đề chỉ cần 39 nên phải bỏ nguyên một nhóm.
    const p3 = Array.from({ length: 14 }, (_, i) => nhom("toeic.p3", `g${i}`, 3)).flat();
    const { db, createMany } = fakeDb(kho({ "toeic.p3": p3 }));

    const r = await buildExam(db, { title: "Đề 1", rand: hatGiong(7) });

    expect(r).toEqual({ ok: true, examId: "e1" });
    const chon = dsCauHoi(createMany).filter((id) => id.startsWith("toeic.p3"));
    expect(chon).toHaveLength(39);
    for (let i = 0; i < 14; i++) {
      const cua = p3.filter((c) => c.groupId === `g${i}`).map((c) => c.id);
      const lay = cua.filter((id) => chon.includes(id));
      expect(lay.length === 0 || lay.length === 3).toBe(true);
    }
  });

  it("giữ thứ tự createdAt của các câu trong cùng nhóm", async () => {
    const g = nhom("toeic.p7", "g1", 4);
    const p7 = [...g, ...Array.from({ length: 50 }, () => cau("toeic.p7"))];
    const { db, createMany } = fakeDb(kho({ "toeic.p7": p7 }));

    await buildExam(db, { title: "Đề 1", rand: hatGiong(3) });

    const chon = dsCauHoi(createMany);
    const viTri = g.map((c) => chon.indexOf(c.id));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it("báo thiếu đúng Part và số lượng khi không đủ", async () => {
    const { db } = fakeDb(kho({ "toeic.p5": Array.from({ length: 20 }, () => cau("toeic.p5")) }));

    const r = await buildExam(db, { title: "Đề 1", rand: () => 0 });

    expect(r).toEqual({
      ok: false,
      error: "NOT_ENOUGH_QUESTIONS",
      shortage: [{ section: "toeic.p5", need: 30, have: 20 }],
    });
  });

  it("báo thiếu cả nhóm không nhét vừa số câu còn lại", async () => {
    // 12 nhóm 3 câu và 1 nhóm 5 câu (41 câu) nhưng không tổ hợp nào ra đúng 39:
    // lấy nhóm 5 rồi 11 nhóm 3 là 38, nhóm 3 cuối sẽ vượt nên bị bỏ qua.
    const p3 = [...Array.from({ length: 12 }, (_, i) => nhom("toeic.p3", `g${i}`, 3)).flat(), ...nhom("toeic.p3", "to", 5)];
    const { db } = fakeDb(kho({ "toeic.p3": p3 }));

    const r = await buildExam(db, { title: "Đề 1", rand: () => 0 });

    expect(r).toEqual({
      ok: false,
      error: "NOT_ENOUGH_QUESTIONS",
      shortage: [{ section: "toeic.p3", need: 39, have: 38 }],
    });
  });

  it("không tạo đề khi chỉ một Part thiếu", async () => {
    const { db, create, createMany } = fakeDb(kho({ "toeic.p6": Array.from({ length: 15 }, () => cau("toeic.p6")) }));

    const r = await buildExam(db, { title: "Đề 1", rand: () => 0 });

    expect(r.ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("gộp mọi Part thiếu vào một lần báo", async () => {
    const { db } = fakeDb(
      kho({
        "toeic.p1": [cau("toeic.p1")],
        "toeic.p7": Array.from({ length: 50 }, () => cau("toeic.p7")),
      }),
    );

    const r = await buildExam(db, { title: "Đề 1", rand: () => 0 });

    expect(r).toEqual({
      ok: false,
      error: "NOT_ENOUGH_QUESTIONS",
      shortage: [
        { section: "toeic.p1", need: 6, have: 1 },
        { section: "toeic.p7", need: 54, have: 50 },
      ],
    });
  });

  it("khoá được kết quả bằng rand", async () => {
    const k = kho({ "toeic.p5": Array.from({ length: 40 }, () => cau("toeic.p5")) });
    const a = fakeDb(k);
    const b = fakeDb(k);
    const c = fakeDb(k);

    await buildExam(a.db, { title: "Đề 1", rand: hatGiong(42) });
    await buildExam(b.db, { title: "Đề 1", rand: hatGiong(42) });
    await buildExam(c.db, { title: "Đề 1", rand: hatGiong(99) });

    expect(dsCauHoi(b.createMany)).toEqual(dsCauHoi(a.createMany));
    expect(dsCauHoi(c.createMany)).not.toEqual(dsCauHoi(a.createMany));
  });

  it("thứ tự câu đi từ Part 1 đến Part 7", async () => {
    const { db, createMany } = fakeDb(kho());

    await buildExam(db, { title: "Đề 1", rand: hatGiong(5) });

    const data = createMany.mock.calls[0][0];
    expect(data.data).toHaveLength(TONG);
    expect(data.data.map((d) => d.order)).toEqual(Array.from({ length: TONG }, (_, i) => i + 1));
    expect(data.data.every((d) => d.examId === "e1")).toBe(true);
    const phan = data.data.map((d) => d.questionId.split("#")[0]);
    let batDau = 0;
    for (const [s, n] of Object.entries(CAN)) {
      expect(phan.slice(batDau, batDau + n).every((p) => p === s)).toBe(true);
      batDau += n;
    }
  });

  it("tạo đề ở trạng thái nháp và chỉ lấy câu đã đăng", async () => {
    const { db, findMany, create } = fakeDb(kho());

    await buildExam(db, { title: "Đề TOEIC số 1", rand: () => 0 });

    expect(create).toHaveBeenCalledWith({ data: { certificate: "toeic", title: "Đề TOEIC số 1", status: "DRAFT" } });
    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ certificate: "toeic", section: "toeic.p1", status: "PUBLISHED" });
    expect(args.orderBy).toEqual({ createdAt: "asc" });
  });

  it("ném UNKNOWN_CERTIFICATE với chứng chỉ lạ", async () => {
    const { db } = fakeDb(kho());

    await expect(buildExam(db, { title: "Đề 1", certificate: "ielts" })).rejects.toThrow("UNKNOWN_CERTIFICATE");
  });
});
