import type { ReadingGenre, ReadingLevel } from "@prisma/client";
import type { ReadingFile } from "@/features/reading/import-schema";

/** Độ dài một bài đọc, quy ra số từ tiếng Anh mục tiêu. */
export type ReadingLength = "short" | "medium" | "long";

export const LENGTH_WORDS: Record<ReadingLength, number> = { short: 150, medium: 300, long: 500 };

export const system = [
  "You are a writer of English reading material for Vietnamese learners. You produce content as JSON only: no markdown fence, no comment, no text before or after the JSON object.",
  'Every "en" field is natural English. Every "vi" field is a natural Vietnamese translation of that exact sentence — not word for word, but the way a Vietnamese person would say it.',
  "Write original text. Never copy a copyrighted work and never name a real person, company or organisation.",
].join("\n");

const GENRE_RULES: Record<ReadingGenre, string> = {
  HUMOR: "HUMOR: a short funny story with one clear punchline at the end.",
  FAIRY_TALE:
    "FAIRY_TALE: a public-domain folk tale or fable retold in your own words, or an original one in that style. No copyrighted characters.",
  ANIME:
    "ANIME: an original story in anime style (school life, friendship, a small adventure). Invent your own characters; no character or series that belongs to someone else.",
  NEWS: "NEWS: a fictional news report about an everyday event. Invent the town, the people and the organisations; do not name any real one.",
};

const LEVEL_RULES: Record<ReadingLevel, string> = {
  A2: "A2: simple present and simple past, short sentences of about 8–12 words, everyday vocabulary, no idioms.",
  B1: "B1: common tenses including present perfect, sentences of about 12–18 words, a few linking words, plain vocabulary.",
  B2: "B2: varied tenses, relative and conditional clauses, sentences of about 15–25 words, some abstract vocabulary.",
  C1: "C1: idiomatic and precise English, varied sentence rhythm, phrasal verbs, collocations and figurative language where they fit.",
};

/** Ví dụ đầu ra để model bám theo; test chạy qua `readingFileSchema` để không lệch schema. */
export const example: ReadingFile = {
  title: "The Cat Who Guarded the Bakery",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "AI (do hệ thống tạo)",
  license: "Nội dung do AI tạo cho mục đích học tập",
  paragraphs: [
    [
      { en: "A thin cat lived behind a small bakery.", vi: "Một con mèo gầy sống sau một tiệm bánh nhỏ." },
      { en: "Every morning the baker gave her a piece of bread.", vi: "Mỗi sáng, người thợ làm bánh cho nó một miếng bánh mì." },
      { en: "The cat wanted to thank him, but she had no money.", vi: "Con mèo muốn cảm ơn ông, nhưng nó không có tiền." },
      { en: "So she decided to watch the door at night.", vi: "Thế là nó quyết định canh cửa vào ban đêm." },
    ],
    [
      { en: "One night a thief came to the bakery.", vi: "Một đêm nọ, một tên trộm đến tiệm bánh." },
      { en: "The cat jumped onto a shelf and knocked down a big metal pot.", vi: "Con mèo nhảy lên kệ và làm rơi một cái nồi kim loại to." },
      { en: "The noise woke the whole street, and the thief ran away.", vi: "Tiếng động đánh thức cả con phố, và tên trộm bỏ chạy." },
      { en: "After that, the baker gave the cat bread and a warm bed.", vi: "Từ đó, người thợ làm bánh cho con mèo bánh mì và một chiếc giường ấm." },
    ],
  ],
};

/** Prompt viết bằng tiếng Anh cho model, nhưng mọi câu phải kèm bản dịch tiếng Việt. */
export function buildReadingPrompt(p: {
  genre: ReadingGenre;
  level: ReadingLevel;
  length: ReadingLength;
  topic?: string;
}): { system: string; user: string } {
  const words = LENGTH_WORDS[p.length];
  return {
    system,
    user: [
      `Write one English reading passage of about ${words} words (stay within ±20% of ${words} words).`,
      `Genre — ${GENRE_RULES[p.genre]}`,
      `Level — ${LEVEL_RULES[p.level]}`,
      p.topic ? `Topic: ${p.topic}.` : "Choose a topic that suits the genre.",
      'Split the text into paragraphs of 3–6 sentences each. Every sentence is one item with its own "en" and "vi".',
      `Set "genre" to "${p.genre}" and "level" to "${p.level}". Keep "sourceName" and "license" exactly as in the example and do not add "sourceUrl".`,
      "Return one JSON object with the same shape as this example:",
      JSON.stringify(example, null, 2),
    ].join("\n\n"),
  };
}
