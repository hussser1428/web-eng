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
const audioCreate = vi.fn();
const examCreate = vi.fn();
const examUpdate = vi.fn();
const examQuestionCreateMany = vi.fn();
const jobCreate = vi.fn();
const jobUpdate = vi.fn();
const jobFindUnique = vi.fn();
const readingCreate = vi.fn();
const readingFindUnique = vi.fn();
const readingUpdate = vi.fn();
const readingDelete = vi.fn();
const sentenceDeleteMany = vi.fn();
const sentenceCreateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      findMany: (a: unknown) => findMany(a),
      updateMany: (a: unknown) => updateMany(a),
      findUnique: (a: unknown) => findUnique(a),
      update: (a: unknown) => update(a),
      create: (a: unknown) => create(a),
    },
    questionGroup: { create: (a: unknown) => groupCreate(a) },
    audioFile: { create: (a: unknown) => audioCreate(a) },
    exam: { create: (a: unknown) => examCreate(a), update: (a: unknown) => examUpdate(a) },
    examQuestion: { createMany: (a: unknown) => examQuestionCreateMany(a) },
    generationJob: {
      create: (a: unknown) => jobCreate(a),
      update: (a: unknown) => jobUpdate(a),
      findUnique: (a: unknown) => jobFindUnique(a),
    },
    reading: {
      create: (a: unknown) => readingCreate(a),
      findUnique: (a: unknown) => readingFindUnique(a),
      update: (a: unknown) => readingUpdate(a),
      delete: (a: unknown) => readingDelete(a),
    },
    readingSentence: {
      deleteMany: (a: unknown) => sentenceDeleteMany(a),
      createMany: (a: unknown) => sentenceCreateMany(a),
    },
    $transaction: (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
  },
}));

const llmMock = vi.fn();
vi.mock("@/lib/providers/llm", () => ({ getLlmProvider: () => llmMock() }));

const synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
vi.mock("@/lib/providers/tts", () => ({ getTtsProvider: () => ({ synthesize }) }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import {
  setStatusAction,
  updateQuestionAction,
  importAction,
  buildExamAction,
  setExamStatusAction,
  generateAction,
  retryJobAction,
  generateAudioAction,
  setReadingStatusAction,
  deleteReadingAction,
  updateReadingAction,
  importReadingAction,
  generateReadingAction,
  retryReadingJobAction,
} from "./actions";

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

    expect(r).toEqual({ ok: true, questions: 1, groups: 0, examId: null, published: false });
    expect(create.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", source: "IMPORT" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
  });

  it("tích Đăng ngay thì lưu PUBLISHED và tạo đề khi có tên đề", async () => {
    const r = await importAction(null, formNhap({ publish: "on", examTitle: "Đề mẫu 1" }));

    expect(r).toEqual({ ok: true, questions: 1, groups: 0, examId: "e1", published: true });
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

/** Số câu mỗi phần TOEIC, dùng để giả lập kho câu đã đăng vừa đủ. */
const CAN: Record<string, number> = {
  "toeic.p1": 6,
  "toeic.p2": 25,
  "toeic.p3": 39,
  "toeic.p4": 30,
  "toeic.p5": 30,
  "toeic.p6": 16,
  "toeic.p7": 54,
};

/** Trả đúng số câu đã đăng cho từng phần; `thieu` giảm số câu của một phần để dựng cảnh thiếu. */
function khoDaDang(thieu: Record<string, number> = {}) {
  return async (a: { where: { section: string } }) => {
    const s = a.where.section;
    const n = thieu[s] ?? CAN[s];
    return Array.from({ length: n }, (_, i) => ({ id: `${s}#${i}`, groupId: null, createdAt: new Date(2026, 0, 1, 0, 0, i) }));
  };
}

describe("buildExamAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    findMany.mockReset();
    examCreate.mockReset();
    examQuestionCreateMany.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    findMany.mockImplementation(khoDaDang());
    examCreate.mockResolvedValue({ id: "e1" });
    examQuestionCreateMany.mockResolvedValue({ count: 200 });
  });

  function formGhep(title: string) {
    const fd = new FormData();
    fd.set("title", title);
    return fd;
  }

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(buildExamAction(null, formGhep("Đề 1"))).rejects.toThrow("FORBIDDEN");
    expect(examCreate).not.toHaveBeenCalled();
  });

  it("báo lỗi khi chưa nhập tên đề", async () => {
    await expect(buildExamAction(null, formGhep("   "))).resolves.toEqual({ ok: false, message: "Nhập tên đề." });
    expect(examCreate).not.toHaveBeenCalled();
  });

  it("ghép xong thì trả mã đề và làm mới trang", async () => {
    await expect(buildExamAction(null, formGhep("Đề TOEIC số 1"))).resolves.toEqual({ ok: true, examId: "e1" });

    expect(examCreate).toHaveBeenCalledWith({ data: { certificate: "toeic", title: "Đề TOEIC số 1", status: "DRAFT" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/exams");
  });

  it("kèm tên Part khi thiếu câu và không tạo đề", async () => {
    findMany.mockImplementation(khoDaDang({ "toeic.p5": 20 }));

    await expect(buildExamAction(null, formGhep("Đề 1"))).resolves.toEqual({
      ok: false,
      message: "Chưa đủ câu đã đăng để ghép đề.",
      shortage: [{ section: "toeic.p5", name: "Part 5 – Hoàn thành câu", need: 30, have: 20 }],
    });
    expect(examCreate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setExamStatusAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    examUpdate.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    examUpdate.mockResolvedValue({});
  });

  function formDe(id: string, status: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    return fd;
  }

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(setExamStatusAction(formDe("e1", "PUBLISHED"))).rejects.toThrow("FORBIDDEN");
    expect(examUpdate).not.toHaveBeenCalled();
  });

  it("từ chối status lạ và thiếu mã đề", async () => {
    await setExamStatusAction(formDe("e1", "ARCHIVED"));
    await setExamStatusAction(formDe("", "PUBLISHED"));

    expect(examUpdate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("đăng đề rồi làm mới cả trang quản trị lẫn trang thi", async () => {
    await setExamStatusAction(formDe("e1", "PUBLISHED"));

    expect(examUpdate).toHaveBeenCalledWith({ where: { id: "e1" }, data: { status: "PUBLISHED" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/exams");
    expect(revalidatePath).toHaveBeenCalledWith("/exam");
  });
});

const generateJson = vi.fn();

/** Dựng lại cảnh chung: admin thật, LLM giả trả đúng một câu Part 5 hợp lệ. */
function chuanBiSinh() {
  authMock.mockReset();
  llmMock.mockReset();
  generateJson.mockReset();
  jobCreate.mockReset();
  jobUpdate.mockReset();
  jobFindUnique.mockReset();
  create.mockReset();
  groupCreate.mockReset();
  revalidatePath.mockReset();
  authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  llmMock.mockReturnValue({ generateJson });
  generateJson.mockResolvedValue({ certificate: "toeic", questions: [cauMau] });
  jobCreate.mockResolvedValue({ id: "j1" });
  jobUpdate.mockResolvedValue({});
  create.mockResolvedValue({ id: "q1" });
}

function formSinh(p: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ section: "toeic.p5", count: "5", skillTag: "", ...p })) fd.set(k, v);
  return fd;
}

describe("generateAction", () => {
  beforeEach(chuanBiSinh);

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });

    await expect(generateAction(null, formSinh())).rejects.toThrow("FORBIDDEN");
    expect(jobCreate).not.toHaveBeenCalled();
  });

  it("báo chưa cấu hình khi thiếu LLM_API_KEY và không tạo job", async () => {
    llmMock.mockReturnValue(null);

    await expect(generateAction(null, formSinh())).resolves.toBe("Chưa cấu hình LLM (LLM_API_KEY)");
    expect(jobCreate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("từ chối Part chưa hỗ trợ và số câu ngoài 1–10", async () => {
    const loi = "Chọn Part 2–7 và số câu từ 1 đến 10.";
    await expect(generateAction(null, formSinh({ section: "toeic.p1" }))).resolves.toBe(loi);
    await expect(generateAction(null, formSinh({ count: "11" }))).resolves.toBe(loi);
    await expect(generateAction(null, formSinh({ count: "0" }))).resolves.toBe(loi);

    expect(jobCreate).not.toHaveBeenCalled();
  });

  it("sinh xong thì lưu câu nháp nguồn AI, báo số câu và làm mới trang", async () => {
    await expect(generateAction(null, formSinh({ skillTag: "grammar.tense" }))).resolves.toBe("Đã tạo 1 câu nháp");

    expect(jobCreate.mock.calls[0][0].data).toMatchObject({
      status: "RUNNING",
      createdById: "u1",
      params: { certificate: "toeic", section: "toeic.p5", count: 5, skillTag: "grammar.tense" },
    });
    expect(create.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", source: "AI" });
    expect(jobUpdate.mock.calls[0][0].data).toMatchObject({ status: "DONE", resultCount: 1 });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/generate");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("ô kỹ năng bỏ trống thì không ghim tag nào", async () => {
    await generateAction(null, formSinh());

    expect(jobCreate.mock.calls[0][0].data.params).toMatchObject({ skillTag: null });
  });

  it("đổi mã lỗi của LLM sang thông báo tiếng Việt", async () => {
    // generateQuestions log nguyên lỗi ra server; nuốt đi cho output test sạch.
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateJson.mockRejectedValue(new Error("LLM_RATE_LIMITED"));
    await expect(generateAction(null, formSinh())).resolves.toBe("Hết hạn mức, thử lại sau vài phút");
    expect(jobUpdate.mock.calls[0][0].data).toMatchObject({ status: "FAILED", error: "LLM_RATE_LIMITED" });

    chuanBiSinh();
    generateJson.mockResolvedValue({ khong: "phai-cau-hoi" });
    await expect(generateAction(null, formSinh())).resolves.toBe("Model trả về JSON không hợp lệ, hãy thử lại");

    chuanBiSinh();
    generateJson.mockRejectedValue(new Error("LLM_UNAVAILABLE"));
    await expect(generateAction(null, formSinh())).resolves.toBe("Không gọi được LLM");
  });

  it("mã lỗi lạ vẫn hiện ra chứ không nuốt mất", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateJson.mockRejectedValue(new Error("LO_GI_DO"));

    await expect(generateAction(null, formSinh())).resolves.toBe("Sinh thất bại: LO_GI_DO");
  });
});

describe("retryJobAction", () => {
  beforeEach(chuanBiSinh);

  function formChayLai(jobId: string) {
    const fd = new FormData();
    fd.set("jobId", jobId);
    return fd;
  }

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });

    await expect(retryJobAction(formChayLai("j0"))).rejects.toThrow("FORBIDDEN");
    expect(jobFindUnique).not.toHaveBeenCalled();
  });

  it("dùng lại params của job cũ để tạo job mới", async () => {
    jobFindUnique.mockResolvedValue({
      id: "j0",
      params: { certificate: "toeic", section: "toeic.p7", count: 3, skillTag: "reading.detail" },
    });

    await retryJobAction(formChayLai("j0"));

    expect(jobFindUnique).toHaveBeenCalledWith({ where: { id: "j0" } });
    expect(jobCreate.mock.calls[0][0].data).toMatchObject({
      params: { section: "toeic.p7", count: 3, skillTag: "reading.detail" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/generate");
  });

  it("job không tồn tại hoặc params hỏng thì im lặng bỏ qua", async () => {
    jobFindUnique.mockResolvedValue(null);
    await expect(retryJobAction(formChayLai("khong-co"))).resolves.toBeUndefined();

    jobFindUnique.mockResolvedValue({ id: "j0", params: { section: "toeic.p1", count: 99 } });
    await expect(retryJobAction(formChayLai("j0"))).resolves.toBeUndefined();

    expect(jobCreate).not.toHaveBeenCalled();
  });
});

describe("generateAudioAction", () => {
  function formAudio(ids: string[]) {
    const fd = new FormData();
    for (const id of ids) fd.append("ids", id);
    return fd;
  }

  beforeEach(() => {
    findMany.mockReset();
    update.mockReset();
    audioCreate.mockReset();
    revalidatePath.mockReset();
    synthesize.mockClear();
    synthesize.mockResolvedValue(new Uint8Array([1, 2, 3]));
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    audioCreate.mockResolvedValue({ id: "a1" });
    update.mockResolvedValue({});
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });

    await expect(generateAudioAction(null, formAudio(["q1"]))).rejects.toThrow("FORBIDDEN");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("chưa tích câu nào thì báo và không gọi TTS", async () => {
    await expect(generateAudioAction(null, formAudio([]))).resolves.toBe("Chưa chọn câu nào.");
    expect(findMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("tổng kết số mục đã tạo, bỏ qua và lỗi rồi làm mới trang", async () => {
    findMany.mockResolvedValue([
      { id: "q1", section: "toeic.p2", transcript: "Q: Hi there?", audioUrl: null, groupId: null, group: null },
      { id: "q2", section: "toeic.p2", transcript: null, audioUrl: null, groupId: null, group: null },
    ]);

    await expect(generateAudioAction(null, formAudio(["q1", "q2"]))).resolves.toBe(
      "Đã tạo audio cho 1 mục, bỏ qua 1 (đã có audio hoặc không có transcript), lỗi 0.",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
  });

  it("nêu mã lỗi đầu tiên khi TTS hỏng", async () => {
    findMany.mockResolvedValue([
      { id: "q1", section: "toeic.p2", transcript: "Q: Hi?", audioUrl: null, groupId: null, group: null },
    ]);
    synthesize.mockRejectedValue(new Error("TTS_UNAVAILABLE"));

    await expect(generateAudioAction(null, formAudio(["q1"]))).resolves.toBe(
      "Đã tạo audio cho 0 mục, bỏ qua 0 (đã có audio hoặc không có transcript), lỗi 1 (TTS_UNAVAILABLE).",
    );
  });

  it("báo khi chọn quá 10 mục", async () => {
    findMany.mockResolvedValue([]);
    const ids = Array.from({ length: 12 }, (_, i) => `q${i}`);

    const r = await generateAudioAction(null, formAudio(ids));

    expect(r).toContain("Chỉ xử lý 10 mục đầu.");
    expect(findMany.mock.calls[0][0].where.id.in).toHaveLength(10);
  });
});

const baiDoc = {
  title: "Con cáo và chùm nho",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "Aesop",
  sourceUrl: "",
  license: "Public domain",
  paragraphs: [[{ en: "A fox saw grapes.", vi: "Cáo thấy nho." }]],
};

function formBaiDoc(p: Partial<Record<string, string>> = {}) {
  const fd = new FormData();
  fd.set("id", "r1");
  fd.set("title", baiDoc.title);
  fd.set("genre", baiDoc.genre);
  fd.set("level", baiDoc.level);
  fd.set("sourceName", baiDoc.sourceName);
  fd.set("sourceUrl", baiDoc.sourceUrl);
  fd.set("license", baiDoc.license);
  fd.set("paragraphs", JSON.stringify(baiDoc.paragraphs));
  for (const [k, v] of Object.entries(p)) fd.set(k, v as string);
  return fd;
}

describe("hành động bài đọc", () => {
  beforeEach(() => {
    authMock.mockReset();
    revalidatePath.mockReset();
    readingFindUnique.mockReset();
    readingUpdate.mockReset();
    readingDelete.mockReset();
    sentenceDeleteMany.mockReset();
    sentenceCreateMany.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    readingFindUnique.mockResolvedValue({ id: "r1" });
    readingUpdate.mockResolvedValue({});
    readingDelete.mockResolvedValue({});
    sentenceDeleteMany.mockResolvedValue({ count: 1 });
    sentenceCreateMany.mockResolvedValue({ count: 1 });
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(updateReadingAction(null, formBaiDoc())).rejects.toThrow("FORBIDDEN");
    const fd = new FormData();
    fd.set("id", "r1");
    fd.set("status", "PUBLISHED");
    await expect(setReadingStatusAction(fd)).rejects.toThrow("FORBIDDEN");
    await expect(deleteReadingAction(fd)).rejects.toThrow("FORBIDDEN");
    expect(readingUpdate).not.toHaveBeenCalled();
    expect(readingDelete).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lưu xong thì trả null và làm mới cả trang quản trị lẫn trang học", async () => {
    await expect(updateReadingAction(null, formBaiDoc())).resolves.toBeNull();

    expect(sentenceCreateMany).toHaveBeenCalledWith({
      data: [{ readingId: "r1", order: 1, paragraphIndex: 0, en: "A fox saw grapes.", vi: "Cáo thấy nho." }],
    });
    const duong = revalidatePath.mock.calls.map((c) => c[0]);
    expect(duong).toEqual(["/admin/readings", "/reading", "/admin/readings/r1", "/reading/r1"]);
  });

  it("ô URL để trống thì lưu thành null chứ không phải chuỗi rỗng", async () => {
    await updateReadingAction(null, formBaiDoc());
    expect(readingUpdate).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: expect.objectContaining({ sourceUrl: null }),
    });
  });

  it("JSON câu hỏng thì báo dữ liệu không hợp lệ, không đụng database", async () => {
    const r = await updateReadingAction(null, formBaiDoc({ paragraphs: "{không phải json" }));
    expect(r).toBe("Dữ liệu không hợp lệ. Kiểm tra tiêu đề, nguồn, giấy phép và các câu.");
    expect(sentenceCreateMany).not.toHaveBeenCalled();
  });

  it("thiếu tiêu đề thì báo dữ liệu không hợp lệ", async () => {
    const r = await updateReadingAction(null, formBaiDoc({ title: "  " }));
    expect(r).toBe("Dữ liệu không hợp lệ. Kiểm tra tiêu đề, nguồn, giấy phép và các câu.");
  });

  it("báo không tìm thấy khi bài đã bị xoá", async () => {
    readingFindUnique.mockResolvedValue(null);
    await expect(updateReadingAction(null, formBaiDoc())).resolves.toBe("Không tìm thấy bài đọc.");
  });

  it("đăng bài rồi làm mới trang đọc", async () => {
    const fd = new FormData();
    fd.set("id", "r1");
    fd.set("status", "PUBLISHED");
    await setReadingStatusAction(fd);

    expect(readingUpdate).toHaveBeenCalledWith({ where: { id: "r1" }, data: { status: "PUBLISHED" } });
    expect(revalidatePath).toHaveBeenCalledWith("/reading");
  });

  it("trạng thái lạ thì bỏ qua, không đoán ý", async () => {
    const fd = new FormData();
    fd.set("id", "r1");
    fd.set("status", "XOA_HET");
    await setReadingStatusAction(fd);
    expect(readingUpdate).not.toHaveBeenCalled();
  });

  it("xoá bài rồi làm mới danh sách", async () => {
    const fd = new FormData();
    fd.set("id", "r1");
    await deleteReadingAction(fd);

    expect(readingDelete).toHaveBeenCalledWith({ where: { id: "r1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/readings");
  });
});

/** Bài đọc hợp lệ theo `readingFileSchema`: một đoạn hai câu. */
const baiMau = {
  title: "The Fox and the Grapes",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "AI (do hệ thống tạo)",
  license: "Nội dung do AI tạo cho mục đích học tập",
  paragraphs: [
    [
      { en: "A fox saw grapes.", vi: "Cáo thấy chùm nho." },
      { en: "They were too high.", vi: "Chúng ở quá cao." },
    ],
  ],
};

function formNhapBaiDoc(p: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("json", JSON.stringify(baiMau));
  for (const [k, v] of Object.entries(p)) fd.set(k, v);
  return fd;
}

describe("importReadingAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    readingCreate.mockReset();
    sentenceCreateMany.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    readingCreate.mockResolvedValue({ id: "r1" });
    sentenceCreateMany.mockResolvedValue({ count: 2 });
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });

    await expect(importReadingAction(null, formNhapBaiDoc())).rejects.toThrow("FORBIDDEN");
    expect(readingCreate).not.toHaveBeenCalled();
  });

  it("báo lỗi khi chưa dán nội dung", async () => {
    const fd = new FormData();
    fd.set("json", "   ");

    await expect(importReadingAction(null, fd)).resolves.toEqual({ ok: false, issues: ["Chưa có nội dung JSON."] });
    expect(readingCreate).not.toHaveBeenCalled();
  });

  it("báo lỗi khi JSON hỏng", async () => {
    const r = await importReadingAction(null, formNhapBaiDoc({ json: "{ khong-phai-json" }));

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatch(/^JSON không hợp lệ: /);
    expect(readingCreate).not.toHaveBeenCalled();
  });

  it("liệt kê lỗi zod kèm đường dẫn trường", async () => {
    const r = await importReadingAction(
      null,
      formNhapBaiDoc({ json: JSON.stringify({ ...baiMau, genre: "SCI_FI" }) }),
    );

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatch(/^genre: /);
    expect(readingCreate).not.toHaveBeenCalled();
  });

  it("mặc định vào nháp, trả số câu và làm mới trang", async () => {
    const r = await importReadingAction(null, formNhapBaiDoc());

    expect(r).toEqual({ ok: true, readingId: "r1", sentences: 2, published: false });
    expect(readingCreate.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", source: "IMPORT" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/readings");
    expect(revalidatePath).toHaveBeenCalledWith("/reading");
  });

  it("tích Đăng ngay thì lưu PUBLISHED", async () => {
    const r = await importReadingAction(null, formNhapBaiDoc({ publish: "on" }));

    expect(r).toMatchObject({ ok: true, published: true });
    expect(readingCreate.mock.calls[0][0].data).toMatchObject({ status: "PUBLISHED" });
  });

  it("database hỏng thì báo trong form chứ không nổ ra ngoài", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    readingCreate.mockRejectedValue(new Error("Can't reach database server"));

    await expect(importReadingAction(null, formNhapBaiDoc())).resolves.toEqual({
      ok: false,
      issues: ["Không nhập được bài đọc."],
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

function chuanBiSinhBaiDoc() {
  authMock.mockReset();
  llmMock.mockReset();
  generateJson.mockReset();
  jobCreate.mockReset();
  jobUpdate.mockReset();
  jobFindUnique.mockReset();
  readingCreate.mockReset();
  sentenceCreateMany.mockReset();
  revalidatePath.mockReset();
  authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  llmMock.mockReturnValue({ generateJson });
  generateJson.mockResolvedValue(baiMau);
  jobCreate.mockResolvedValue({ id: "j1" });
  jobUpdate.mockResolvedValue({});
  readingCreate.mockResolvedValue({ id: "r1" });
  sentenceCreateMany.mockResolvedValue({ count: 2 });
}

function formSinhBaiDoc(p: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ genre: "FAIRY_TALE", level: "A2", length: "short", topic: "", ...p })) {
    fd.set(k, v);
  }
  return fd;
}

describe("generateReadingAction", () => {
  beforeEach(chuanBiSinhBaiDoc);

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });

    await expect(generateReadingAction(null, formSinhBaiDoc())).rejects.toThrow("FORBIDDEN");
    expect(jobCreate).not.toHaveBeenCalled();
  });

  it("báo chưa cấu hình khi thiếu LLM_API_KEY và không tạo job", async () => {
    llmMock.mockReturnValue(null);

    await expect(generateReadingAction(null, formSinhBaiDoc())).resolves.toBe("Chưa cấu hình LLM (LLM_API_KEY)");
    expect(jobCreate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("từ chối thể loại, độ khó, độ dài lạ", async () => {
    const loi = "Chọn thể loại, độ khó và độ dài hợp lệ.";
    await expect(generateReadingAction(null, formSinhBaiDoc({ genre: "SCI_FI" }))).resolves.toBe(loi);
    await expect(generateReadingAction(null, formSinhBaiDoc({ level: "Z9" }))).resolves.toBe(loi);
    await expect(generateReadingAction(null, formSinhBaiDoc({ length: "huge" }))).resolves.toBe(loi);

    expect(jobCreate).not.toHaveBeenCalled();
  });

  it("sinh xong thì lưu bài nháp nguồn AI, báo tên bài và làm mới trang", async () => {
    await expect(generateReadingAction(null, formSinhBaiDoc({ topic: "một khu chợ" }))).resolves.toBe(
      "Đã tạo bài nháp: The Fox and the Grapes",
    );

    expect(jobCreate.mock.calls[0][0].data).toMatchObject({
      type: "reading",
      status: "RUNNING",
      createdById: "u1",
      params: { genre: "FAIRY_TALE", level: "A2", length: "short", topic: "một khu chợ" },
    });
    expect(readingCreate.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", source: "AI" });
    expect(jobUpdate.mock.calls[0][0].data).toMatchObject({ status: "DONE", resultCount: 2 });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/readings");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/readings/generate");
  });

  it("ô chủ đề bỏ trống thì không ghim chủ đề nào", async () => {
    await generateReadingAction(null, formSinhBaiDoc());

    expect(jobCreate.mock.calls[0][0].data.params).toMatchObject({ topic: null });
  });

  it("đổi mã lỗi của LLM sang thông báo tiếng Việt", async () => {
    // generateReading log nguyên lỗi ra server; nuốt đi cho output test sạch.
    vi.spyOn(console, "error").mockImplementation(() => {});
    generateJson.mockRejectedValue(new Error("LLM_RATE_LIMITED"));
    await expect(generateReadingAction(null, formSinhBaiDoc())).resolves.toBe("Hết hạn mức, thử lại sau vài phút");
    expect(jobUpdate.mock.calls[0][0].data).toMatchObject({ status: "FAILED", error: "LLM_RATE_LIMITED" });

    chuanBiSinhBaiDoc();
    generateJson.mockResolvedValue({ khong: "phai-bai-doc" });
    await expect(generateReadingAction(null, formSinhBaiDoc())).resolves.toBe(
      "Model trả về JSON không hợp lệ, hãy thử lại",
    );

    chuanBiSinhBaiDoc();
    generateJson.mockRejectedValue(new Error("LO_GI_DO"));
    await expect(generateReadingAction(null, formSinhBaiDoc())).resolves.toBe("Sinh thất bại: LO_GI_DO");
  });
});

describe("retryReadingJobAction", () => {
  beforeEach(chuanBiSinhBaiDoc);

  function formChayLaiBaiDoc(jobId: string) {
    const fd = new FormData();
    fd.set("jobId", jobId);
    return fd;
  }

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });

    await expect(retryReadingJobAction(formChayLaiBaiDoc("j0"))).rejects.toThrow("FORBIDDEN");
    expect(jobFindUnique).not.toHaveBeenCalled();
  });

  it("dùng lại params của job cũ để tạo job mới", async () => {
    jobFindUnique.mockResolvedValue({
      id: "j0",
      type: "reading",
      params: { genre: "NEWS", level: "B1", length: "medium", topic: null },
    });

    await retryReadingJobAction(formChayLaiBaiDoc("j0"));

    expect(jobFindUnique).toHaveBeenCalledWith({ where: { id: "j0" } });
    expect(jobCreate.mock.calls[0][0].data).toMatchObject({
      type: "reading",
      params: { genre: "NEWS", level: "B1", length: "medium", topic: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/readings/generate");
  });

  it("job không tồn tại, sai loại hoặc params hỏng thì im lặng bỏ qua", async () => {
    jobFindUnique.mockResolvedValue(null);
    await expect(retryReadingJobAction(formChayLaiBaiDoc("khong-co"))).resolves.toBeUndefined();

    // Job sinh câu hỏi: đúng id nhưng sai loại, không được chạy lại thành bài đọc.
    jobFindUnique.mockResolvedValue({ id: "j0", type: "questions", params: { section: "toeic.p5", count: 3 } });
    await expect(retryReadingJobAction(formChayLaiBaiDoc("j0"))).resolves.toBeUndefined();

    jobFindUnique.mockResolvedValue({ id: "j0", type: "reading", params: { genre: "SCI_FI" } });
    await expect(retryReadingJobAction(formChayLaiBaiDoc("j0"))).resolves.toBeUndefined();

    expect(jobCreate).not.toHaveBeenCalled();
  });
});
