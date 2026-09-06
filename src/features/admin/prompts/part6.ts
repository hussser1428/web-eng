import { skillTagLine } from "./skill-tags";

export const system = [
  "You are a TOEIC item writer. You produce exam content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "explanation" field must be written in Vietnamese (tiếng Việt), 1–2 sentences, explaining why the key is correct.',
  "All other fields (stem, choices, passage) stay in natural business English.",
].join("\n");

/** Ví dụ đầu ra để model bám theo; test chạy qua `questionFileSchema` để không lệch schema. */
export const example = {
  certificate: "toeic",
  groups: [
    {
      key: "memo1",
      section: "toeic.p6",
      passage:
        "To: All staff\nFrom: Facilities Department\n\nThe main parking lot will be closed for resurfacing from Monday, June 3 (1) Wednesday, June 5. During this period, employees are asked to park in the overflow lot behind Building C. (2). If you have questions, (3) contact the Facilities Department at extension 2200. Thank you for your (4).",
    },
  ],
  questions: [
    {
      section: "toeic.p6",
      groupKey: "memo1",
      stem: "(1)",
      choices: ["through", "until", "by", "at"],
      answer: 0,
      explanation: "'from ... through ...' chỉ khoảng thời gian tính cả ngày cuối.",
      skillTags: ["grammar.preposition"],
    },
    {
      section: "toeic.p6",
      groupKey: "memo1",
      stem: "(2)",
      choices: [
        "Shuttle buses will run every 15 minutes.",
        "The cafeteria menu has been updated.",
        "Applications are due next month.",
        "The lot was built in 1998.",
      ],
      answer: 0,
      explanation: "Câu chèn phải nối ý với bãi đỗ tạm, chỉ phương án xe đưa đón hợp mạch văn.",
      skillTags: ["reading.inference"],
    },
    {
      section: "toeic.p6",
      groupKey: "memo1",
      stem: "(3)",
      choices: ["pleased", "pleasing", "please", "pleasure"],
      answer: 2,
      explanation: "Câu mệnh lệnh lịch sự dùng 'please contact'.",
      skillTags: ["grammar.word-form"],
    },
    {
      section: "toeic.p6",
      groupKey: "memo1",
      stem: "(4)",
      choices: ["cooperation", "competition", "collection", "correction"],
      answer: 0,
      explanation: "'Thank you for your cooperation' là cụm cố định cuối thông báo nội bộ.",
      skillTags: ["vocab.collocation"],
    },
  ],
};

export function user(count: number, skillTag?: string): string {
  const passages = Math.max(1, Math.ceil(count / 4));
  return [
    `Write ${passages} ${passages === 1 ? "passage" : "passages"} for section "toeic.p6" (TOEIC Part 6 – text completion) with exactly 4 questions each: ${passages * 4} questions in total (requested: ${count}).`,
    "Each passage is a short business text (memo, email, notice, article) of 80–120 words containing exactly four numbered blanks written as (1), (2), (3), (4).",
    'Put each passage in "groups" with a unique "key"; every question repeats that key in "groupKey" and uses the blank marker as its "stem", for example "(1)".',
    "One of the four questions must be a sentence-insertion item whose choices are complete sentences.",
    'Set "section" to "toeic.p6" on every group and every question. "answer" is the 0-based index of the correct choice.',
    skillTagLine(skillTag),
    "Return one JSON object with the same shape as this example:",
    JSON.stringify(example, null, 2),
  ].join("\n\n");
}
