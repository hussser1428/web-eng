import type { ReadingGenre, ReadingLevel } from "@prisma/client";

export const GENRE_LABELS: Record<ReadingGenre, string> = {
  HUMOR: "Truyện hài",
  FAIRY_TALE: "Cổ tích",
  ANIME: "Anime",
  NEWS: "Tin tức",
};

export const LEVEL_LABELS: Record<ReadingLevel, string> = {
  A2: "A2 – Sơ cấp",
  B1: "B1 – Trung cấp",
  B2: "B2 – Trên trung cấp",
  C1: "C1 – Nâng cao",
};

export const GENRES = Object.keys(GENRE_LABELS) as ReadingGenre[];
export const LEVELS = Object.keys(LEVEL_LABELS) as ReadingLevel[];
