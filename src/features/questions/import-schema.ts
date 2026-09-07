import { z } from "zod";
import { audioUrlSchema } from "@/features/audio/audio-url";

const imageUrlSchema = z.url({ protocol: /^https?$/ });

const questionItem = z
  .object({
    section: z.string().min(1),
    groupKey: z.string().min(1).optional(),
    stem: z.string().max(2000).optional(),
    choices: z.array(z.string().min(1)).min(3).max(4),
    answer: z.number().int().min(0),
    explanation: z.string().min(1).max(3000),
    skillTags: z.array(z.string().min(1)).default([]),
    audioUrl: audioUrlSchema.optional(),
    imageUrl: imageUrlSchema.optional(),
    transcript: z.string().max(5000).optional(),
  })
  .refine((q) => q.answer < q.choices.length, { path: ["answer"], message: "answer phải nhỏ hơn số lựa chọn" });

export const questionFileSchema = z.object({
  certificate: z.string().min(1).default("toeic"),
  groups: z
    .array(
      z.object({
        key: z.string().min(1),
        section: z.string().min(1),
        passage: z.string().max(10000).optional(),
        transcript: z.string().max(10000).optional(),
        audioUrl: audioUrlSchema.optional(),
        imageUrl: imageUrlSchema.optional(),
      }),
    )
    .default([]),
  questions: z.array(questionItem).min(1),
});

export type QuestionFile = z.infer<typeof questionFileSchema>;
