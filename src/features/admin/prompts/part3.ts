import { groupCount } from "./limits";
import { skillTagLine } from "./skill-tags";

export const system = [
  "You are a TOEIC item writer. You produce exam content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "explanation" field must be written in Vietnamese (tiếng Việt), 1–2 sentences, explaining why the key is correct.',
  'All other fields (stem, choices, transcript) stay in natural spoken business English. The "transcript" is what voices will read aloud, so write only words, never stage directions.',
].join("\n");

/** Ví dụ đầu ra để model bám theo; test chạy qua `questionFileSchema` và `splitTranscript`. */
export const example = {
  certificate: "toeic",
  groups: [
    {
      key: "conv1",
      section: "toeic.p3",
      transcript: [
        "M: Hi, Elena. Did the new laptops for the design team arrive this morning?",
        "W: They did, but only eight of the twelve we ordered were in the delivery.",
        "M: That's a problem. The team starts the client project on Monday.",
        "W: I called the supplier already. The rest ship tomorrow and arrive Friday.",
        "M: Friday should still work. Can you set up the eight we have today?",
        "W: I can, though I'll need the software licence keys from you first.",
        "M: I'll email them right after this meeting.",
        "W: Great. Then everything will be ready before the team comes in.",
      ].join("\n"),
    },
  ],
  questions: [
    {
      section: "toeic.p3",
      groupKey: "conv1",
      stem: "What problem does the woman mention?",
      choices: [
        "A delivery was incomplete.",
        "A client cancelled a project.",
        "Some laptops were damaged.",
        "A supplier raised its prices.",
      ],
      answer: 0,
      explanation: "Người phụ nữ nói chỉ có 8 trong 12 máy được giao, tức là đơn hàng giao thiếu.",
      skillTags: ["listening.detail"],
    },
    {
      section: "toeic.p3",
      groupKey: "conv1",
      stem: "What will the man do next?",
      choices: [
        "Call the supplier",
        "Send some licence keys",
        "Meet the design team",
        "Return the laptops",
      ],
      answer: 1,
      explanation: "Người đàn ông hứa gửi email khoá bản quyền ngay sau cuộc họp.",
      skillTags: ["listening.detail"],
    },
    {
      section: "toeic.p3",
      groupKey: "conv1",
      stem: "Where do the speakers most likely work?",
      choices: [
        "At a shipping company",
        "At a computer repair shop",
        "At a design firm",
        "At a university library",
      ],
      answer: 2,
      explanation: "Họ nói về đội thiết kế và dự án cho khách hàng nên nhiều khả năng làm ở công ty thiết kế.",
      skillTags: ["listening.inference"],
    },
  ],
};

export function user(count: number, skillTag?: string): string {
  const groups = groupCount(count);
  return [
    `Write ${groups} ${groups === 1 ? "conversation" : "conversations"} for section "toeic.p3" (TOEIC Part 3 – short conversations), each with exactly 3 questions (${groups * 3} questions in total, requested: ${count}).`,
    'Put each conversation in "groups" with a unique "key" and its "transcript"; every question repeats that key in "groupKey".',
    'The "transcript" is 8 to 12 lines of a workplace conversation between two speakers, alternating strictly: lines starting with "M: " for the man and "W: " for the woman. No blank lines, no speaker names, no other prefix.',
    'Each question has a full question in "stem" and exactly 4 choices. "answer" is the 0-based index of the correct choice, and every answer must be verifiable from the transcript alone.',
    "Mix question types across each conversation: a detail, a next action or suggestion, and a gist question about the topic, the place or the speakers' jobs.",
    'Set "section" to "toeic.p3" on every group and every question.',
    skillTagLine(skillTag),
    "Return one JSON object with the same shape as this example:",
    JSON.stringify(example, null, 2),
  ].join("\n\n");
}
