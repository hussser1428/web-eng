import { skillTagLine } from "./skill-tags";

export const system = [
  "You are a TOEIC item writer. You produce exam content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "explanation" field must be written in Vietnamese (tiếng Việt), 1–2 sentences, explaining why the key is correct.',
  "All other fields (stem, choices, passage) stay in natural business English.",
].join("\n");

/** Ví dụ đầu ra để model bám theo; test chạy qua `questionFileSchema` để không lệch schema. */
export const example = {
  certificate: "toeic",
  groups: [],
  questions: [
    {
      section: "toeic.p5",
      stem: "The quarterly report ___ to the board by the end of this week.",
      choices: ["submits", "submitted", "will be submitted", "submitting"],
      answer: 2,
      explanation: "Chủ ngữ 'report' chịu tác động nên dùng bị động, 'by the end of this week' chỉ tương lai.",
      skillTags: ["grammar.tense"],
    },
    {
      section: "toeic.p5",
      stem: "Ms. Alvarez has worked at the company ___ 2015.",
      choices: ["for", "since", "during", "from"],
      answer: 1,
      explanation: "'since' đi với mốc thời gian trong thì hiện tại hoàn thành.",
      skillTags: ["grammar.preposition"],
    },
  ],
};

export function user(count: number, skillTag?: string): string {
  return [
    `Write ${count} questions for section "toeic.p5" (TOEIC Part 5 – incomplete sentences).`,
    "Each question is standalone: a business-English sentence with one blank written as ___ , exactly 4 choices, exactly one correct answer.",
    'Set "section" to "toeic.p5" on every question, leave "groups" empty and do not use "groupKey".',
    '"answer" is the 0-based index of the correct choice. The three distractors must be plausible but clearly wrong.',
    skillTagLine(skillTag),
    "Return one JSON object with the same shape as this example:",
    JSON.stringify(example, null, 2),
  ].join("\n\n");
}
