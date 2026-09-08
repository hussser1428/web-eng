import { groupCount } from "./limits";
import { skillTagLine } from "./skill-tags";

export const system = [
  "You are a TOEIC item writer. You produce exam content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "explanation" field must be written in Vietnamese (tiếng Việt), 1–2 sentences, explaining why the key is correct.',
  'All other fields (stem, choices, transcript) stay in natural spoken business English. The "transcript" is what a voice will read aloud, so write only words, never stage directions.',
].join("\n");

/** Ví dụ đầu ra để model bám theo; test chạy qua `questionFileSchema` và `splitTranscript`. */
export const example = {
  certificate: "toeic",
  groups: [
    {
      key: "talk1",
      section: "toeic.p4",
      transcript: [
        "Good morning, everyone, and welcome to the Riverside Convention Centre.",
        "Before the first session begins, I have two quick announcements about today's schedule.",
        "The workshop on export documentation has been moved from Room 2 to the larger auditorium on the ground floor, because more than two hundred people registered for it.",
        "If you planned to attend, please go downstairs rather than upstairs after this opening talk.",
        "Second, lunch will be served in the garden terrace at half past twelve instead of in the main hall.",
        "Staff in blue jackets will be at every corridor to point you in the right direction.",
        "Your name badge includes a meal ticket, so please keep it visible at all times.",
        "Thank you for your patience, and enjoy the conference.",
      ].join("\n"),
    },
  ],
  questions: [
    {
      section: "toeic.p4",
      groupKey: "talk1",
      stem: "Where does the talk most likely take place?",
      choices: ["At a conference centre", "At a train station", "In a factory", "In a hotel restaurant"],
      answer: 0,
      explanation: "Người nói chào mừng khách đến trung tâm hội nghị và giới thiệu lịch các phiên họp.",
      skillTags: ["listening.gist"],
    },
    {
      section: "toeic.p4",
      groupKey: "talk1",
      stem: "Why was the workshop moved?",
      choices: [
        "A room is being repaired.",
        "The speaker is unavailable.",
        "Too many people registered.",
        "The session was cancelled.",
      ],
      answer: 2,
      explanation: "Buổi workshop chuyển sang hội trường lớn vì có hơn hai trăm người đăng ký.",
      skillTags: ["listening.detail"],
    },
    {
      section: "toeic.p4",
      groupKey: "talk1",
      stem: "What are the listeners asked to do?",
      choices: [
        "Register for lunch online",
        "Keep their name badges visible",
        "Return to the main hall at noon",
        "Collect a printed schedule",
      ],
      answer: 1,
      explanation: "Người nói dặn giữ thẻ tên luôn nhìn thấy được vì trên đó có phiếu ăn trưa.",
      skillTags: ["listening.detail"],
    },
  ],
};

export function user(count: number, skillTag?: string): string {
  const groups = groupCount(count);
  return [
    `Write ${groups} ${groups === 1 ? "talk" : "talks"} for section "toeic.p4" (TOEIC Part 4 – short talks), each with exactly 3 questions (${groups * 3} questions in total, requested: ${count}).`,
    'Put each talk in "groups" with a unique "key" and its "transcript"; every question repeats that key in "groupKey".',
    'The "transcript" is a single speaker talking for 100 to 140 words: an announcement, a voice message, an advertisement, a tour introduction or a short broadcast. Write one sentence per line and use no speaker prefix at all, no blank lines.',
    'Each question has a full question in "stem" and exactly 4 choices. "answer" is the 0-based index of the correct choice, and every answer must be verifiable from the transcript alone.',
    "Mix question types across each talk: the purpose or place of the talk, a specific detail, and what the listeners are asked to do next.",
    'Set "section" to "toeic.p4" on every group and every question.',
    skillTagLine(skillTag),
    "Return one JSON object with the same shape as this example:",
    JSON.stringify(example, null, 2),
  ].join("\n\n");
}
