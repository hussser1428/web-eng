import { z } from "zod";
import { audioUrlSchema } from "@/features/audio/audio-url";

/**
 * Dữ liệu sửa một câu hỏi. Dùng chung cho Server Action (parse `FormData`) và `updateQuestion`.
 * Trường tuỳ chọn bỏ trống phải là `undefined` (nghĩa là xoá giá trị cũ), không phải chuỗi rỗng.
 */
export const updateQuestionSchema = z.object({
  stem: z.string().max(2000).optional(),
  choices: z.array(z.string().min(1)).min(3).max(4),
  answer: z.number().int().min(0),
  explanation: z.string().min(1).max(3000),
  skillTags: z.array(z.string().min(1)).default([]),
  audioUrl: audioUrlSchema.optional(),
  imageUrl: z.url({ protocol: /^https?$/ }).optional(),
  transcript: z.string().max(5000).optional(),
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
