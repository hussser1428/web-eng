import type { z } from "zod";
import { readingFileSchema } from "../import-schema";

/** Sửa bài đọc dùng đúng các trường của file nhập, nên dùng lại nguyên schema đó. */
export const updateReadingSchema = readingFileSchema;

export type UpdateReadingInput = z.infer<typeof updateReadingSchema>;
