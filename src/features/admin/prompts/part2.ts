import { skillTagLine } from "./skill-tags";

export const system = [
  "You are a TOEIC item writer. You produce exam content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "explanation" field must be written in Vietnamese (tiếng Việt), 1–2 sentences, explaining why the key is correct.',
  'All other fields (choices, transcript) stay in natural spoken business English. The "transcript" is what a narrator will read aloud, so write only words, never stage directions.',
].join("\n");

/** Ví dụ đầu ra để model bám theo; test chạy qua `questionFileSchema` và `splitTranscript`. */
export const example = {
  certificate: "toeic",
  groups: [],
  questions: [
    {
      section: "toeic.p2",
      choices: ["By Thursday afternoon.", "In the meeting room upstairs.", "Yes, it was a long meeting."],
      answer: 0,
      explanation: "Câu hỏi 'When' hỏi thời điểm nên đáp lại bằng mốc thời gian 'By Thursday afternoon'.",
      skillTags: ["listening.question-response"],
      transcript:
        "Q: When will the sales report be ready?\nA: By Thursday afternoon.\nB: In the meeting room upstairs.\nC: Yes, it was a long meeting.",
    },
    {
      section: "toeic.p2",
      choices: ["She works in accounting.", "I'll ask the receptionist.", "The printer is out of paper."],
      answer: 1,
      explanation: "Câu hỏi 'Who' về người phụ trách; đáp 'Tôi sẽ hỏi lễ tân' là cách trả lời gián tiếp hợp lý.",
      skillTags: ["listening.question-response"],
      transcript:
        "Q: Who is in charge of the visitor badges?\nA: She works in accounting.\nB: I'll ask the receptionist.\nC: The printer is out of paper.",
    },
  ],
};

export function user(count: number, skillTag?: string): string {
  return [
    `Write ${count} questions for section "toeic.p2" (TOEIC Part 2 – question–response).`,
    'Each question is standalone: leave "groups" empty, do not use "groupKey", and do not write a "stem" field at all — the audio carries the question.',
    'Give exactly 3 choices: the three spoken responses. Exactly one answers the question; the other two must sound plausible (similar words, right topic) but not answer it. "answer" is the 0-based index of the correct choice.',
    '"transcript" is exactly 4 lines with no blank line between them: "Q: <the spoken question>", then "A: ", "B: ", "C: " followed by the three choices in the same order as "choices" (same wording, character for character).',
    "Vary the question types across the set: when/where/who/why/how questions, yes-no questions, statements, and a few indirect answers.",
    'Set "section" to "toeic.p2" on every question.',
    skillTagLine(skillTag),
    "Return one JSON object with the same shape as this example:",
    JSON.stringify(example, null, 2),
  ].join("\n\n");
}
