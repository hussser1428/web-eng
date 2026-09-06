// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const findMany = vi.fn();
const updateMany = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
const create = vi.fn();
const groupCreate = vi.fn();
const examCreate = vi.fn();
const examQuestionCreateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findMany: () => findMany(),
      updateMany: (a: unknown) => updateMany(a),
      findUnique: (a: unknown) => findUnique(a),
      update: (a: unknown) => update(a),
      create: (a: unknown) => create(a),
    },
    questionGroup: { create: (a: unknown) => groupCreate(a) },
    exam: { create: (a: unknown) => examCreate(a) },
    examQuestion: { createMany: (a: unknown) => examQuestionCreateMany(a) },
  },
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import { setStatusAction, updateQuestionAction, importAction } from "./actions";

function form(ids: string[], status: string) {
  const fd = new FormData();
  for (const id of ids) fd.append("ids", id);
  fd.set("status", status);
  return fd;
}

describe("setStatusAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    findMany.mockReset();
    updateMany.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    findMany.mockResolvedValue([]);
    updateMany.mockImplementation(async (a: { where: { id: { in: string[] } } }) => ({ count: a.where.id.in.length }));
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(setStatusAction(null, form(["a"], "PUBLISHED"))).rejects.toThrow("FORBIDDEN");
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("báo lỗi khi chưa chọn câu nào", async () => {
    await expect(setStatusAction(null, form([], "PUBLISHED"))).resolves.toBe("Chưa chọn câu nào.");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("từ chối status lạ thay vì mặc định gỡ", async () => {
    await expect(setStatusAction(null, form(["a", "b"], "ARCHIVED"))).resolves.toBe("Thao tác không hợp lệ.");

    const thieuStatus = new FormData();
    thieuStatus.append("ids", "a");
    await expect(setStatusAction(null, thieuStatus)).resolves.toBe("Thao tác không hợp lệ.");

    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("đăng xong thì báo số câu và làm mới trang", async () => {
    findMany.mockResolvedValue([
      { id: "a", section: "toeic.p5", audioUrl: null, group: null },
      { id: "b", section: "toeic.p5", audioUrl: null, group: null },
    ]);

    await expect(setStatusAction(null, form(["a", "b"], "PUBLISHED"))).resolves.toBe("Đã đăng 2 câu.");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
  });

  it("nói rõ số câu thiếu audio không đăng được", async () => {
    findMany.mockResolvedValue([
      { id: "a", section: "toeic.p5", audioUrl: null, group: null },
      { id: "b", section: "toeic.p2", audioUrl: null, group: null },
    ]);

    await expect(setStatusAction(null, form(["a", "b"], "PUBLISHED"))).resolves.toBe(
      "Đã đăng 1 câu, 1 câu Listening thiếu audio không đăng được.",
    );
  });

  it("gỡ thì báo số câu đã gỡ", async () => {
    await expect(setStatusAction(null, form(["a", "b", "c"], "DRAFT"))).resolves.toBe("Đã gỡ 3 câu.");
    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["a", "b", "c"] } }, data: { status: "DRAFT" } });
  });
});

function formSua(p: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  const mac: Record<string, string | string[]> = {
    id: "q1",
    stem: "The report ___ yesterday.",
    choices: ["submit", "was submitted", "submitting", "submits"],
    answer: "1",
    explanation: "Câu bị động thì quá khứ.",
    skillTags: "bị động, , thì",
    audioUrl: "",
    imageUrl: "",
    transcript: "",
    ...p,
  };
  for (const [k, v] of Object.entries(mac)) {
    if (Array.isArray(v)) for (const x of v) fd.append(k, x);
    else fd.set(k, v);
  }
  return fd;
}

describe("updateQuestionAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUnique.mockReset();
    update.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    findUnique.mockResolvedValue({ certificate: "toeic", section: "toeic.p5" });
    update.mockResolvedValue({});
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(updateQuestionAction(null, formSua())).rejects.toThrow("FORBIDDEN");
    expect(update).not.toHaveBeenCalled();
  });

  it("lưu xong thì trả null và làm mới cả danh sách lẫn trang câu hỏi", async () => {
    await expect(updateQuestionAction(null, formSua())).resolves.toBeNull();

    expect(update.mock.calls[0][0]).toEqual({
      where: { id: "q1" },
      data: {
        stem: "The report ___ yesterday.",
        choices: ["submit", "was submitted", "submitting", "submits"],
        answer: 1,
        explanation: "Câu bị động thì quá khứ.",
        skillTags: ["bị động", "thì"],
        audioUrl: null,
        imageUrl: null,
        transcript: null,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions/q1");
  });

  it("từ chối khi giải thích rỗng hoặc audioUrl không phải đường dẫn", async () => {
    await expect(updateQuestionAction(null, formSua({ explanation: "   " }))).resolves.toBe(
      "Dữ liệu không hợp lệ. Kiểm tra lại lựa chọn, giải thích và đường dẫn audio/ảnh.",
    );
    await expect(updateQuestionAction(null, formSua({ audioUrl: "khong-phai-url" }))).resolves.toBe(
      "Dữ liệu không hợp lệ. Kiểm tra lại lựa chọn, giải thích và đường dẫn audio/ảnh.",
    );

    expect(update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("từ chối khi chưa tích radio đáp án thay vì lặng lẽ đổi thành A", async () => {
    const fd = formSua();
    fd.delete("answer");

    await expect(updateQuestionAction(null, fd)).resolves.toBe("Chưa chọn đáp án.");

    expect(update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("đổi mã lỗi nghiệp vụ thành thông báo tiếng Việt", async () => {
    findUnique.mockResolvedValue(null);
    await expect(updateQuestionAction(null, formSua())).resolves.toBe("Không tìm thấy câu hỏi.");

    findUnique.mockResolvedValue({ certificate: "toeic", section: "toeic.p2" });
    await expect(updateQuestionAction(null, formSua())).resolves.toBe("Số lựa chọn không khớp phần thi.");

    findUnique.mockResolvedValue({ certificate: "toeic", section: "toeic.p5" });
    await expect(updateQuestionAction(null, formSua({ answer: "4" }))).resolves.toBe(
      "Đáp án nằm ngoài danh sách lựa chọn.",
    );

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const cauMau = {
  section: "toeic.p5",
  stem: "The report ___ by Friday.",
  choices: ["submit", "submitted", "will be submitted", "submitting"],
  answer: 2,
  explanation: "Bị động.",
};

function formNhap(p: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("json", JSON.stringify({ questions: [cauMau] }));
  for (const [k, v] of Object.entries(p)) fd.set(k, v);
  return fd;
}

describe("importAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    create.mockReset();
    groupCreate.mockReset();
    examCreate.mockReset();
    examQuestionCreateMany.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    create.mockResolvedValue({ id: "q1" });
    groupCreate.mockResolvedValue({ id: "g1" });
    examCreate.mockResolvedValue({ id: "e1" });
    examQuestionCreateMany.mockResolvedValue({ count: 1 });
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(importAction(null, formNhap())).rejects.toThrow("FORBIDDEN");
    expect(create).not.toHaveBeenCalled();
  });

  it("báo lỗi khi chưa dán nội dung", async () => {
    const fd = new FormData();
    fd.set("json", "   ");

    await expect(importAction(null, fd)).resolves.toEqual({ ok: false, issues: ["Chưa có nội dung JSON."] });
    expect(create).not.toHaveBeenCalled();
  });

  it("báo lỗi khi JSON hỏng", async () => {
    const r = await importAction(null, formNhap({ json: "{ khong-phai-json" }));

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]).toMatch(/^JSON không hợp lệ: /);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("liệt kê lỗi zod kèm đường dẫn trường", async () => {
    const r = await importAction(null, formNhap({ json: JSON.stringify({ questions: [{ ...cauMau, answer: 9 }] }) }));

    expect(r).toEqual({ ok: false, issues: ["questions.0.answer: answer phải nhỏ hơn số lựa chọn"] });
    expect(create).not.toHaveBeenCalled();
  });

  it("mặc định vào nháp, trả số câu và làm mới trang", async () => {
    const r = await importAction(null, formNhap());

    expect(r).toEqual({ ok: true, questions: 1, groups: 0, examId: null });
    expect(create.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", source: "IMPORT" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
  });

  it("tích Đăng ngay thì lưu PUBLISHED và tạo đề khi có tên đề", async () => {
    const r = await importAction(null, formNhap({ publish: "on", examTitle: "Đề mẫu 1" }));

    expect(r).toEqual({ ok: true, questions: 1, groups: 0, examId: "e1" });
    expect(create.mock.calls[0][0].data).toMatchObject({ status: "PUBLISHED" });
    expect(examCreate).toHaveBeenCalledWith({ data: { certificate: "toeic", title: "Đề mẫu 1", status: "PUBLISHED" } });
  });

  it("đổi mã lỗi nghiệp vụ thành tiếng Việt", async () => {
    const section = await importAction(null, formNhap({ json: JSON.stringify({ questions: [{ ...cauMau, section: "toeic.p9" }] }) }));
    expect(section).toEqual({ ok: false, issues: ["Phần thi không có trong chứng chỉ: toeic.p9."] });

    const choices = await importAction(null, formNhap({ json: JSON.stringify({ questions: [{ ...cauMau, section: "toeic.p2" }] }) }));
    expect(choices).toEqual({ ok: false, issues: ["Câu thứ 1 có số lựa chọn không khớp phần thi."] });

    const cert = await importAction(null, formNhap({ json: JSON.stringify({ certificate: "ielts", questions: [cauMau] }) }));
    expect(cert).toEqual({ ok: false, issues: ["Chứng chỉ không hỗ trợ."] });

    const group = await importAction(null, formNhap({ json: JSON.stringify({ questions: [{ ...cauMau, groupKey: "nope" }] }) }));
    expect(group).toEqual({ ok: false, issues: ["Câu hỏi trỏ tới nhóm chưa khai báo: nope."] });

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
