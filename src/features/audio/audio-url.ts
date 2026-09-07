import { z } from "zod";

/** Đường dẫn phục vụ audio do chính hệ thống lưu, ví dụ "/api/audio/abc123". */
export const RELATIVE_AUDIO_RE = /^\/api\/audio\/[a-z0-9]+$/;

/** audioUrl chấp nhận URL http(s) ngoài hoặc đường dẫn tương đối tới /api/audio/<id>. */
export const audioUrlSchema = z.url({ protocol: /^https?$/ }).or(z.string().regex(RELATIVE_AUDIO_RE));

export const audioUrlOf = (id: string) => `/api/audio/${id}`;
