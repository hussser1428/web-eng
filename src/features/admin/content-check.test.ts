import { describe, it, expect } from "vitest";
import { checkQuestion, checkReading, type QuestionForCheck } from "./content-check";

function baseQuestion(overrides: Partial<QuestionForCheck> = {}): QuestionForCheck {
  return {
    id: "q1",
    section: "toeic.p5",
    choices: ["a book", "a pen", "a chair", "a table"],
    answer: 0,
    explanation: "Đáp án đúng vì chủ ngữ số ít.",
    transcript: null,
    audioUrl: null,
    group: null,
    ...overrides,
  };
}

describe("checkQuestion", () => {
  it("ANSWER_OUT_OF_RANGE khi answer vượt số lựa chọn", () => {
    const errors = checkQuestion(baseQuestion({ answer: 4 }));
    expect(errors).toContain("ANSWER_OUT_OF_RANGE");
  });

  it("DUPLICATE_CHOICES khi hai lựa chọn trùng nhau sau trim/lowercase", () => {
    const errors = checkQuestion(baseQuestion({ choices: ["A book", "a pen", "A BOOK ", "a table"] }));
    expect(errors).toContain("DUPLICATE_CHOICES");
  });

  it("EXPLANATION_NOT_VI khi explanation không có dấu tiếng Việt", () => {
    const errors = checkQuestion(baseQuestion({ explanation: "This is the correct answer." }));
    expect(errors).toContain("EXPLANATION_NOT_VI");
  });

  it("MISSING_AUDIO khi section có audio nhưng câu và nhóm đều không có audioUrl", () => {
    const errors = checkQuestion(baseQuestion({ section: "toeic.p1", audioUrl: null, group: null }));
    expect(errors).toContain("MISSING_AUDIO");
  });

  it("không báo MISSING_AUDIO khi section không cần audio", () => {
    const errors = checkQuestion(baseQuestion({ section: "toeic.p5", audioUrl: null, group: null }));
    expect(errors).not.toContain("MISSING_AUDIO");
  });

  it("P2_TRANSCRIPT_LINES khi transcript P2 không đúng 4 dòng Q/A/B/C", () => {
    const errors = checkQuestion(
      baseQuestion({
        section: "toeic.p2",
        choices: ["By Thursday.", "In the meeting room.", "Yes, it was long."],
        audioUrl: "/api/audio/1",
        transcript: "Q: When will the report be ready?\nA: By Thursday.\nB: In the meeting room.",
      }),
    );
    expect(errors).toContain("P2_TRANSCRIPT_LINES");
  });

  it("P2_CHOICES_MISMATCH khi A/B/C không khớp choices", () => {
    const errors = checkQuestion(
      baseQuestion({
        section: "toeic.p2",
        choices: ["By Thursday.", "In the meeting room.", "Yes, it was long."],
        audioUrl: "/api/audio/1",
        transcript:
          "Q: When will the report be ready?\nA: By Thursday.\nB: In the meeting room.\nC: No, not at all.",
      }),
    );
    expect(errors).toContain("P2_CHOICES_MISMATCH");
  });

  it("P2 hợp lệ (4 dòng khớp choices, không phân biệt hoa thường và dấu câu cuối) thì không báo lỗi P2", () => {
    const errors = checkQuestion(
      baseQuestion({
        section: "toeic.p2",
        choices: ["By Thursday afternoon.", "In the meeting room upstairs.", "Yes, it was a long meeting."],
        audioUrl: "/api/audio/1",
        transcript:
          "Q: When will the sales report be ready?\nA: by thursday afternoon\nB: IN THE MEETING ROOM UPSTAIRS.\nC: Yes, it was a long meeting.",
      }),
    );
    expect(errors).not.toContain("P2_TRANSCRIPT_LINES");
    expect(errors).not.toContain("P2_CHOICES_MISMATCH");
  });
});

describe("checkReading", () => {
  it("TOO_SHORT khi ít hơn 8 câu", () => {
    const errors = checkReading({ sentences: Array.from({ length: 5 }, () => ({ en: "A cat sat.", vi: "Con mèo ngồi." })) });
    expect(errors).toContain("TOO_SHORT");
  });

  it("VI_NOT_VI khi câu vi không có dấu tiếng Việt", () => {
    const sentences = Array.from({ length: 8 }, () => ({ en: "A cat sat.", vi: "Con meo ngoi." }));
    const errors = checkReading({ sentences });
    expect(errors).toContain("VI_NOT_VI");
  });

  it("EN_HAS_VI khi câu en có dấu tiếng Việt", () => {
    const sentences = Array.from({ length: 8 }, () => ({ en: "Con mèo ngồi.", vi: "Con mèo ngồi." }));
    const errors = checkReading({ sentences });
    expect(errors).toContain("EN_HAS_VI");
  });

  it("bài hợp lệ thì không có lỗi", () => {
    const sentences = Array.from({ length: 8 }, () => ({ en: "A cat sat on the mat.", vi: "Con mèo ngồi trên thảm." }));
    const errors = checkReading({ sentences });
    expect(errors).toEqual([]);
  });
});
