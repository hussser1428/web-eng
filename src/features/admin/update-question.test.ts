import { describe, it, expect, vi } from "vitest";
import { updateQuestion } from "./update-question";
import type { UpdateQuestionInput } from "./update-question-schema";

function fakeDb(row: { certificate: string; section: string } | null) {
  const findUnique = vi.fn(async () => row);
  const update = vi.fn(async (args: unknown) => args);
  return { db: { question: { findUnique, update } } as never, findUnique, update };
}

function input(p: Partial<UpdateQuestionInput> = {}): UpdateQuestionInput {
  return {
    choices: ["submit", "was submitted", "submitting", "submits"],
    answer: 1,
    explanation: "Câu bị động thì quá khứ.",
    skillTags: [],
    ...p,
  };
}

describe("updateQuestion", () => {
  it("NOT_FOUND khi không có câu hỏi", async () => {
    const { db, update } = fakeDb(null);

    await expect(updateQuestion(db, "khong-co", input())).rejects.toThrow("NOT_FOUND");
    expect(update).not.toHaveBeenCalled();
  });

  it("INVALID_CHOICES khi số lựa chọn khác Part", async () => {
    const { db, update } = fakeDb({ certificate: "toeic", section: "toeic.p2" });

    await expect(updateQuestion(db, "q1", input())).rejects.toThrow("INVALID_CHOICES");
    expect(update).not.toHaveBeenCalled();
  });

  it("INVALID_ANSWER khi answer vượt số lựa chọn", async () => {
    const { db, update } = fakeDb({ certificate: "toeic", section: "toeic.p5" });

    await expect(updateQuestion(db, "q1", input({ answer: 4 }))).rejects.toThrow("INVALID_ANSWER");
    expect(update).not.toHaveBeenCalled();
  });

  it("lưu đủ trường và xoá audio/ảnh/transcript khi bỏ trống", async () => {
    const { db, update } = fakeDb({ certificate: "toeic", section: "toeic.p5" });

    await updateQuestion(db, "q1", input({ stem: "The report ___ yesterday.", skillTags: ["bị động"] }));

    expect(update.mock.calls[0][0]).toEqual({
      where: { id: "q1" },
      data: {
        stem: "The report ___ yesterday.",
        choices: ["submit", "was submitted", "submitting", "submits"],
        answer: 1,
        explanation: "Câu bị động thì quá khứ.",
        skillTags: ["bị động"],
        audioUrl: null,
        imageUrl: null,
        transcript: null,
      },
    });
  });

  it("giữ nguyên audio, ảnh và transcript khi có giá trị", async () => {
    const { db, update } = fakeDb({ certificate: "toeic", section: "toeic.p3" });

    await updateQuestion(
      db,
      "q2",
      input({ audioUrl: "https://cdn.example/a.mp3", imageUrl: "https://cdn.example/a.png", transcript: "W: Hello." }),
    );

    const data = (update.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.audioUrl).toBe("https://cdn.example/a.mp3");
    expect(data.imageUrl).toBe("https://cdn.example/a.png");
    expect(data.transcript).toBe("W: Hello.");
  });
});
