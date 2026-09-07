import { z } from "zod";

const sentence = z.object({
  en: z.string().trim().min(1).max(1000),
  vi: z.string().trim().min(1).max(1000),
});

export const readingFileSchema = z.object({
  title: z.string().trim().min(1).max(200),
  genre: z.enum(["HUMOR", "FAIRY_TALE", "ANIME", "NEWS"]),
  level: z.enum(["A2", "B1", "B2", "C1"]),
  sourceName: z.string().trim().min(1).max(200),
  sourceUrl: z.url({ protocol: /^https?$/ }).optional(),
  license: z.string().trim().min(1).max(300),
  paragraphs: z.array(z.array(sentence).min(1).max(200)).min(1).max(200),
});

export type ReadingFile = z.infer<typeof readingFileSchema>;
