# Kế hoạch 7: TTS, sinh Part 2–4 bằng AI và quản trị bài đọc

> **Dành cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để làm theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để đánh dấu.

**Mục tiêu:** (1) Câu Listening có transcript được tạo audio bằng Edge TTS ngay trên trang quản trị, nên Part 1–4 đăng được và AI sinh được Part 2, 3, 4. (2) Audio dùng chung của nhóm Part 3/4 chỉ phát một lần cho cả nhóm, và trạng thái "đã phát" giữ khi người học chuyển câu (trả nợ README). (3) Admin quản lý bài đọc trên web: danh sách, đăng/gỡ, xoá, sửa từng câu, nhập JSON, sinh bằng AI.

**Kiến trúc:** Provider TTS (`src/lib/providers/tts/`) theo đúng khuôn `translate`/`llm`: interface + factory nhận client giả để test, `index.ts` trả instance. Bọc gói `msedge-tts` (dependency mới duy nhất — spike 2026-09-08 cho thấy WebSocket thuần của Node bị 403 vì không đặt được header `Origin`/`User-Agent`). File MP3 lưu vào bảng `AudioFile` (bytea) và phục vụ qua `GET /api/audio/[id]` để không phụ thuộc hệ thống file khi deploy; `audioUrl` trở thành `/api/audio/<id>`. **Sinh câu hỏi và tạo audio là hai bước tách rời:** LLM chỉ sinh transcript (vào nháp như cũ), admin sửa transcript nếu cần rồi bấm "Tạo audio" cho các câu đã chọn — mỗi request tối đa 10 mục, vừa giới hạn thời gian, vừa để admin duyệt transcript trước khi tốn TTS. Bài đọc sinh bằng AI trả thẳng `readingFileSchema` (Anh + Việt theo cặp câu) rồi đi qua `importReading(source: "AI")`, giống cách câu hỏi tái dùng `importQuestions`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Prisma 6 / PostgreSQL, Zod 4, Vitest + Testing Library, lucide-react, **msedge-tts 2.x** (mới).

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 4.7 quản trị, mục 5 luồng tạo nội dung bằng AI, mục 7 xử lý lỗi).

**Có một migration:** bảng `AudioFile` (Task 2).

## Quyết định đã chốt

Người dùng đã duyệt tổng thể ("làm nốt các kế hoạch"); các mục *(giả định)* do agent lập kế hoạch chọn, thực thi đúng như ghi.

1. **Thêm dependency `msedge-tts`** (kèm `ws`, `axios` là phụ thuộc bắc cầu của nó). Không tự viết giao thức Edge — server Microsoft đổi token/phiên bản định kỳ, gói này là chỗ duy nhất phải cập nhật. Không có `LLM`-style API key: TTS luôn "sẵn sàng", lỗi mạng → mã `TTS_UNAVAILABLE`.
2. **Audio lưu trong Postgres** (`AudioFile.bytes`), phục vụ qua route handler với `Cache-Control: public, max-age=31536000, immutable`. Một câu Part 2 ~30 KB, một nhóm Part 3 ~150 KB; 200 câu Listening ≈ 15 MB — chấp nhận được. *(giả định)*
3. **Tạo audio là bước riêng do admin bấm**, không chạy tự động sau khi LLM sinh. Tối đa `MAX_TTS_ITEMS = 10` mục mỗi lần (mục = một nhóm hoặc một câu lẻ); vượt thì bỏ qua phần dư và báo. *(giả định)*
4. **Quy ước transcript** (LLM và người nhập file đều theo): mỗi dòng một lượt nói. Part 3: dòng bắt đầu `M:` hoặc `W:` (nam/nữ). Part 4: các dòng không tiền tố, một giọng. Part 2: `Q:` (câu hỏi, giọng 1) rồi `A:`, `B:`, `C:` (giọng 2, đọc "A. …"). Part 1: `A:`–`D:` một giọng, đọc "A. …". Dòng không tiền tố ở Part khác → giọng dẫn. Giọng chọn ngẫu nhiên trong bộ US/GB/AU (tiêm `rand`).
5. **Ghép audio nhiều lượt nói bằng cách nối thẳng các MP3** Edge trả về (cùng định dạng 24 kHz 48 kbps mono); trình duyệt phát được, không cần ffmpeg. Không chèn khoảng lặng. *(giả định)*
6. **Part 1 không sinh bằng AI** (cần ảnh). Nhưng Part 1 nhập file có `transcript` + `imageUrl` thì "Tạo audio" vẫn làm được.
7. **Part 2 trên trang học chỉ hiện chữ cái A/B/C**, không hiện nội dung lựa chọn (đúng đề thi thật); sau khi chấm (`reveal`) mới hiện nội dung. Chỉ đổi giao diện, DTO không đổi.
8. **Audio phát một lần theo `src`**: `AudioOnce` được `key={src}` bên trong `QuestionCard` và runner bỏ `key={q.id}` trên `QuestionCard`, nên chuyển câu trong cùng nhóm không cắt/không phát lại. Trạng thái "đã phát" lưu theo `src` trong runner (thi: localStorage `attempt:<id>:played`; drill: state), đánh dấu **lúc bắt đầu phát**.
9. **Bài đọc do AI viết trả cả tiếng Anh lẫn tiếng Việt trong một lần gọi**, theo cặp câu — không tách câu bằng thư viện rồi dịch theo lô như spec mục 5 bước 5 (YAGNI: định dạng theo cặp đã bảo đảm số câu khớp). *(giả định)*
10. **Không làm:** dán tiếng Anh thô để hệ thống tách câu + dịch bằng LibreTranslate (chất lượng thấp, admin dùng AI hoặc JSON); sửa từ điển; tạo câu hỏi bằng form trống (nhập JSON đã đủ); tải file audio/ảnh lên (Part 1 dùng `imageUrl` ngoài). *(giả định)*
11. **`updateReading` thay toàn bộ câu trong `$transaction`** (xoá rồi `createMany`), không cập nhật lẻ từng câu.

## Ràng buộc chung

- **Toàn bộ tiếng Việt:** giao diện, thông báo lỗi, tên test, comment, commit message. Prompt cho LLM viết tiếng Anh nhưng `explanation` và bản dịch phải tiếng Việt.
- **Phân lớp:** `src/features/*` nhận `db` qua tham số (`Pick<PrismaClient, ...>`), nhận `tts`/`llm` qua tham số; chỉ `src/app/**` và `prisma/seed/**` import `@/lib/prisma`, `@/lib/providers/*`.
- **Mọi trang và action `/admin/*` qua `requireAdmin()`** (`"page"`/`"action"`).
- **Không rò đáp án/transcript xuống client trang học** — `dto.ts` giữ nguyên.
- **Dịch vụ ngoài không tin được:** lỗi TTS/LLM là mã (`TTS_UNAVAILABLE`, `LLM_*`), không ném lỗi thô; mỗi mục lỗi không làm hỏng cả lô.
- **Test:** nghiệp vụ dùng fake `db`/`tts`/`llm`; provider dùng client giả tiêm qua factory; action dùng `vi.mock("@/lib/*")` + `// @vitest-environment node`; component dùng Testing Library.
- **Ngẫu nhiên và thời gian tiêm được:** `rand?: () => number`, `now?: () => Date`.
- **Bảng màu:** `bg-background`, `.card`, `text-muted`, `border-line`, `bg-surface-2`, `text-accent`, `text-accent-text`, `.btn-primary`, `text-danger`, `text-info`. Không emoji; icon `lucide-react` + `aria-hidden="true"`.
- **Dependency mới: chỉ `msedge-tts`.**
- Mỗi task kết thúc bằng `npm test`, `npm run typecheck`, `npm run lint` sạch (1 warning `<img>` đã biết), rồi commit.

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `src/lib/providers/tts/types.ts` | `interface TtsProvider { synthesize(input: { text; voice }): Promise<Uint8Array> }`. |
| `src/lib/providers/tts/edge-tts.ts` | Factory bọc `msedge-tts`, nhận `createClient` giả, timeout; lỗi → `TTS_UNAVAILABLE`. |
| `src/lib/providers/tts/index.ts` | `getTtsProvider()` (không cần biến môi trường). |
| `prisma/schema.prisma` | **Sửa:** model `AudioFile`. |
| `src/features/audio/save-audio.ts` | `saveAudio(db, bytes)` → `{ id, url }`. |
| `src/features/audio/audio-url.ts` | `audioUrlSchema` (URL tuyệt đối **hoặc** `/api/audio/<id>`), `isRelativeAudioUrl()`. |
| `src/app/api/audio/[id]/route.ts` | GET bytes, 404 khi không có. |
| `src/features/questions/import-schema.ts`, `src/features/admin/update-question-schema.ts` | **Sửa:** `audioUrl` dùng `audioUrlSchema`. |
| `src/features/admin/tts/voices.ts` | Bộ giọng M/W + `pickVoice(kind, rand)`. |
| `src/features/admin/tts/segments.ts` | `splitTranscript(section, transcript)` thuần → mảng `{ speaker, text }`. |
| `src/features/admin/tts/generate-audio.ts` | `generateAudio(db, tts, { ids }, deps)`: nhóm/câu → tổng hợp → `AudioFile` → cập nhật `audioUrl`. |
| `src/features/admin/list-questions.ts` | **Sửa:** lọc `missingAudio`. |
| `src/features/admin/prompts/part2.ts`, `part3.ts`, `part4.ts`, `index.ts` | Prompt Listening với quy ước transcript. |
| `src/features/admin/llm-json.ts` | `askLlmJson(llm, prompt, schema)`: gọi, Zod, thử lại một lần — tách từ `generate-questions.ts`. |
| `src/features/admin/generate-questions.ts` | **Sửa:** dùng `askLlmJson`, hỗ trợ `toeic.p2`–`p7`. |
| `src/app/admin/actions.ts` | **Sửa:** `generateAudioAction`, mở rộng `sinhSchema`; **thêm** action bài đọc. |
| `src/components/admin/QuestionTable.tsx`, `QuestionFilters.tsx`, `GenerateForm.tsx` | **Sửa:** nút "Tạo audio", lọc "thiếu audio", chọn Part 2–7. |
| `src/components/questions/AudioOnce.tsx`, `QuestionCard.tsx` | **Sửa:** `played`/`onPlayed`, `key={src}`, Part 2 chỉ hiện chữ cái. |
| `src/components/exam/ExamRunner.tsx`, `src/components/drill/DrillRunner.tsx` | **Sửa:** giữ danh sách `src` đã phát; bỏ `key={q.id}`. |
| `src/features/reading/admin/list-readings-admin.ts` | Danh sách mọi trạng thái, lọc, phân trang. |
| `src/features/reading/admin/set-reading-status.ts`, `delete-reading.ts`, `get-reading-admin.ts`, `update-reading.ts`, `update-reading-schema.ts` | CRUD cho admin. |
| `src/features/reading/get-reading.ts` | **Sửa:** tách `toReadingForClient()` để admin dùng lại. |
| `src/features/admin/prompts/reading.ts` | Prompt bài đọc → `readingFileSchema`. |
| `src/features/admin/generate-reading.ts` | Job `type: "reading"` → `importReading(source: "AI")`. |
| `src/features/admin/list-jobs.ts` | **Sửa:** lọc theo `type`. |
| `src/components/admin/ReadingTable.tsx`, `ReadingAdminFilters.tsx`, `ReadingEditForm.tsx`, `ReadingImportForm.tsx`, `ReadingGenerateForm.tsx` | Giao diện admin bài đọc. |
| `src/app/admin/readings/page.tsx`, `readings/[id]/page.tsx`, `readings/import/page.tsx`, `readings/generate/page.tsx` | Trang admin bài đọc. |
| `src/app/admin/layout.tsx` | **Sửa:** thêm link "Bài đọc". |
| `README.md`, `CLAUDE.md`, `.env.example` | Tài liệu. |

---

### Task 1: Provider TTS

**Files:**
- Create: `src/lib/providers/tts/types.ts`, `edge-tts.ts`, `index.ts`
- Modify: `package.json` (`npm i msedge-tts`)
- Test: `src/lib/providers/tts/edge-tts.test.ts`

**Interfaces:**
```ts
// types.ts
export interface TtsProvider {
  /** Trả MP3 (24 kHz, 48 kbps, mono). Ném Error("TTS_UNAVAILABLE") khi dịch vụ lỗi/timeout, Error("EMPTY") khi text rỗng. */
  synthesize(input: { text: string; voice: string }): Promise<Uint8Array>;
}

// edge-tts.ts — client giả phải có đúng ba hàm này (khớp msedge-tts 2.x)
export type EdgeClient = {
  setMetadata(voice: string, format: string): Promise<void>;
  toStream(text: string): { audioStream: AsyncIterable<Uint8Array> };
  close(): void;
};
export function createEdgeTts(opts: { createClient?: () => EdgeClient; timeoutMs?: number /* mặc định 20000 */ }): TtsProvider;
```
- Mặc định `createClient = () => new MsEdgeTTS()` (import `MsEdgeTTS`, `OUTPUT_FORMAT` từ `msedge-tts`; format `OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3`). Mỗi lần `synthesize` tạo client mới, `setMetadata`, gom `audioStream` thành một `Uint8Array`, luôn `close()` trong `finally`. Timeout bằng `Promise.race` với `setTimeout` (clear trong `finally`). Text `trim()` rỗng → `EMPTY`. Stream trả 0 byte → `TTS_UNAVAILABLE`.
- `index.ts`: `let cached; export function getTtsProvider(): TtsProvider` — không đọc env.

**Test cần có:** `it("gom các chunk thành một mảng byte")`, `it("ném EMPTY khi text rỗng")`, `it("ném TTS_UNAVAILABLE khi client ném lỗi")`, `it("ném TTS_UNAVAILABLE khi quá thời gian")` (client giả treo, `timeoutMs: 10`), `it("luôn gọi close")`.

**Bước:**
- [ ] `npm i msedge-tts` (chỉ gói này). Kiểm tra `package.json` có `"msedge-tts": "^2.0.7"`.
- [ ] Test đỏ → provider → xanh.
- [ ] Thử thật một lần bằng script tạm (không commit): `npx tsx -e` gọi `getTtsProvider().synthesize({ text: "Where is the meeting?", voice: "en-US-JennyNeural" })`, in số byte (> 5000 là được). Ghi kết quả vào report. Nếu mạng chặn thì báo, không chặn task.
- [ ] Commit: `feat: nhà cung cấp TTS bọc msedge-tts`.

---

### Task 2: Bảng `AudioFile`, route phục vụ audio và `audioUrl` tương đối

**Files:**
- Modify: `prisma/schema.prisma`, `src/features/questions/import-schema.ts`, `src/features/admin/update-question-schema.ts`
- Create: `src/features/audio/save-audio.ts`, `src/features/audio/audio-url.ts`, `src/app/api/audio/[id]/route.ts`
- Test: `save-audio.test.ts`, `audio-url.test.ts`, `src/app/api/audio/[id]/route.test.ts` (node env, mock `@/lib/prisma`), cập nhật `import-schema.test.ts` (`it("nhận audioUrl dạng /api/audio/<id>")`).

**Schema:**
```prisma
model AudioFile {
  id        String   @id @default(cuid())
  mime      String   @default("audio/mpeg")
  bytes     Bytes
  createdAt DateTime @default(now())
}
```

**Interfaces:**
```ts
// audio-url.ts
export const RELATIVE_AUDIO_RE = /^\/api\/audio\/[a-z0-9]+$/;
export const audioUrlSchema = z.url({ protocol: /^https?$/ }).or(z.string().regex(RELATIVE_AUDIO_RE));
export const audioUrlOf = (id: string) => `/api/audio/${id}`;

// save-audio.ts
export async function saveAudio(db: Pick<PrismaClient, "audioFile">, bytes: Uint8Array, mime = "audio/mpeg"): Promise<{ id: string; url: string }>;
// ném Error("EMPTY") khi bytes.length === 0
```
- Route `GET /api/audio/[id]`: `params` là Promise; `prisma.audioFile.findUnique`; không có → `NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })`; có → `new Response(file.bytes, { headers: { "Content-Type": file.mime, "Cache-Control": "public, max-age=31536000, immutable", "Content-Length": String(file.bytes.length) } })`. Không cần đăng nhập (audio đề thi là nội dung công khai).
- `import-schema.ts` và `update-question-schema.ts`: `audioUrl: audioUrlSchema.optional()`; `imageUrl` cũng đổi sang `z.url({ protocol: /^https?$/ }).optional()` (chặn `javascript:` như đã làm với bài đọc).

**Bước:**
- [ ] Test đỏ → code → xanh. Migration: `npm run db:migrate -- --name audio_file`.
- [ ] Commit: `feat: lưu audio trong database và phục vụ qua /api/audio`.

---

### Task 3: Tách transcript thành lượt nói và tạo audio cho câu đã chọn

**Files:**
- Create: `src/features/admin/tts/voices.ts`, `segments.ts`, `generate-audio.ts`
- Modify: `src/features/admin/list-questions.ts` (lọc `missingAudio`)
- Test: cạnh từng file; cập nhật `list-questions.test.ts`.

**Interfaces:**
```ts
// voices.ts
export type SpeakerKind = "M" | "W" | "N";
export const VOICES: Record<"M" | "W", readonly string[]> = {
  M: ["en-US-GuyNeural", "en-GB-RyanNeural", "en-AU-WilliamNeural"],
  W: ["en-US-JennyNeural", "en-GB-SoniaNeural", "en-AU-NatashaNeural"],
};
/** "N" (dẫn/không rõ giới) chọn ngẫu nhiên giữa M và W. */
export function pickVoice(kind: SpeakerKind, rand: () => number = Math.random): string;

// segments.ts
export type Segment = { speaker: SpeakerKind; text: string };
/**
 * Mỗi dòng một lượt nói. Tiền tố (không phân biệt hoa thường, cho phép "Man:"/"Woman:"):
 *  - "M:" / "W:" → M / W (Part 3)
 *  - "Q:" → speaker "N", text = phần sau (Part 2 câu hỏi)
 *  - "A:".."D:" → text = "A. <phần sau>" (Part 1, 2); speaker: Part 2 dùng "W" nếu Q đã là "M" và ngược lại — đơn giản hoá: Q → "M", A/B/C → "W"; Part 1 → "N"
 *  - không tiền tố → "N"
 * Bỏ dòng trắng. Trả [] khi transcript rỗng.
 */
export function splitTranscript(section: string, transcript: string): Segment[];

// generate-audio.ts
export const MAX_TTS_ITEMS = 10;
export type GenerateAudioDb = Pick<PrismaClient, "question" | "questionGroup" | "audioFile">;
export type GenerateAudioResult = { done: number; skipped: number; failed: number; overflow: number; errors: string[] };
/**
 * Với mỗi id: tải câu kèm nhóm. Có audio (câu hoặc nhóm) → skipped. Nhóm có transcript → tổng hợp một lần cho cả nhóm
 * (dedupe theo groupId trong cùng lô), ghi `questionGroup.audioUrl`. Không thì câu có transcript → ghi `question.audioUrl`.
 * Không có transcript → skipped. Lỗi TTS một mục → failed, ghi `errors` dạng "<id>: TTS_UNAVAILABLE", tiếp tục mục sau.
 * Mục thứ MAX_TTS_ITEMS+1 trở đi → overflow, không xử lý.
 */
export async function generateAudio(db: GenerateAudioDb, tts: TtsProvider, p: { ids: string[] }, deps?: { rand?: () => number }): Promise<GenerateAudioResult>;
```
- Tổng hợp một transcript: `splitTranscript` → với mỗi segment `tts.synthesize({ text, voice })`, **giữ cùng giọng cho cùng speaker trong một transcript** (chọn một lần cho M, một lần cho W, một lần cho N), nối các `Uint8Array` → `saveAudio`.
- `listQuestions` thêm `missingAudio?: boolean`: khi true, `where` thêm `section: { in: <các section hasAudio của spec> }`, `audioUrl: null`, `OR: [{ groupId: null }, { group: { audioUrl: null } }]`.

**Test cần có:**
- `segments`: `it("Part 3 tách M/W theo dòng")`, `it("Part 2 Q là M, A/B/C là W và đọc chữ cái")`, `it("Part 4 không tiền tố là N")`, `it("bỏ dòng trắng")`.
- `generate-audio`: `it("nhóm chỉ tổng hợp một lần dù chọn ba câu")`, `it("bỏ qua câu đã có audio")`, `it("bỏ qua câu không có transcript")`, `it("một mục lỗi không chặn mục sau")`, `it("giữ cùng giọng cho cùng người nói")` (fake tts ghi lại voice), `it("quá 10 mục thì overflow")`.
- `list-questions`: `it("missingAudio chỉ lấy câu Listening chưa có audio câu lẫn nhóm")`.

**Bước:**
- [ ] Test đỏ → code → xanh. Commit: `feat: tạo audio cho câu Listening từ transcript bằng TTS`.

---

### Task 4: Nút "Tạo audio", lọc thiếu audio, sinh Part 2–4 bằng AI

**Files:**
- Create: `src/features/admin/prompts/part2.ts`, `part3.ts`, `part4.ts`, `src/features/admin/llm-json.ts`
- Modify: `prompts/index.ts`, `generate-questions.ts`, `src/app/admin/actions.ts`, `QuestionTable.tsx`, `QuestionFilters.tsx`, `src/app/admin/questions/page.tsx`, `GenerateForm.tsx`, `src/app/admin/generate/page.tsx`
- Test: `prompts/index.test.ts` (ví dụ 3 Part mới qua `questionFileSchema` và `splitTranscript` trả đúng số lượt nói), `llm-json.test.ts`, `generate-questions.test.ts` (giữ xanh), `actions.test.ts` (`generateAudioAction` ném FORBIDDEN khi không phải admin), `QuestionTable.test.tsx` (có nút "Tạo audio").

**Interfaces:**
```ts
// llm-json.ts — tách nguyên logic thử lại một lần đang nằm trong generate-questions.ts
export async function askLlmJson<T>(llm: LlmProvider, prompt: { system: string; user: string }, schema: z.ZodType<T>): Promise<T>;
// ném Error("LLM_BAD_JSON") sau hai lần sai; ném nguyên lỗi LLM_RATE_LIMITED/LLM_UNAVAILABLE không thử lại

// prompts/index.ts
export type PromptSection = "toeic.p2" | "toeic.p3" | "toeic.p4" | "toeic.p5" | "toeic.p6" | "toeic.p7";
```
- **Prompt Part 2:** `count` câu lẻ, mỗi câu: `stem` bỏ trống (không có trường), `choices` = 3 câu đáp lại, `answer`, `explanation` tiếng Việt, `transcript` đúng 4 dòng `Q: …`, `A: …`, `B: …`, `C: …` (A/B/C trùng `choices`), `skillTags` từ danh sách (thêm vào `SKILL_TAGS`: `listening.question-response`, `listening.detail`, `listening.inference`, `listening.gist`).
- **Prompt Part 3:** nhóm 3 câu; `groups[].transcript` 8–12 dòng `M:`/`W:` xen kẽ (hội thoại công sở), mỗi câu `stem` là câu hỏi, 4 `choices`. Số nhóm = `min(3, max(1, round(count/3)))`.
- **Prompt Part 4:** như Part 3 nhưng transcript 100–140 từ, không tiền tố, một người nói (thông báo, tin nhắn thoại, quảng cáo).
- Ví dụ JSON trong mỗi file prompt phải qua `questionFileSchema` **và** `splitTranscript` phải trả ≥ 4 lượt (P2: đúng 4; P3: ≥ 6; P4: ≥ 2).
- `generateQuestions`: thay vòng lặp thử lại bằng `askLlmJson`; phần còn lại giữ nguyên.
- `actions.ts`: `sinhSchema.section` = enum 6 Part; `LOI_SINH.UNSUPPORTED_SECTION` = "Chỉ hỗ trợ Part 2–7"; thêm:
  ```ts
  export async function generateAudioAction(_prev: string | null, formData: FormData): Promise<string | null>
  // requireAdmin("action"); ids = formData.getAll("ids"); rỗng → "Chưa chọn câu nào.";
  // r = generateAudio(prisma, getTtsProvider(), { ids }); revalidatePath("/admin/questions");
  // trả "Đã tạo audio cho 3 mục, bỏ qua 1 (đã có audio hoặc không có transcript), lỗi 0." + (overflow ? " Chỉ xử lý 10 mục đầu." : "")
  ```
- `QuestionTable`: thêm `useActionState(generateAudioAction, null)` thứ hai; nút thứ ba "Tạo audio" (`formAction={audioAction}`, icon `Volume2` size 18) đặt cạnh Đăng/Gỡ; thông báo của action nào hiện của action đó. Trang `/admin/generate`: `maxDuration` giữ 60.
- `QuestionFilters`: checkbox `name="missingAudio" value="1"` "Thiếu audio"; trang đọc `sp.missingAudio === "1"`; `urlTrang` giữ tham số này.
- `GenerateForm`: `PARTS` = section `toeic.p2`…`toeic.p7`; chú thích: "Part 2–4 sinh transcript, sau đó chọn câu ở trang Câu hỏi và bấm Tạo audio. Part 1 cần ảnh nên nhập file." Text mô tả ở trang generate cập nhật tương ứng.

**Bước:**
- [ ] `llm-json.ts` + test, refactor `generate-questions.ts` (test cũ vẫn xanh).
- [ ] Ba prompt + test ví dụ.
- [ ] Action + giao diện + test. Commit: `feat: sinh Part 2-4 bằng AI và tạo audio từ transcript trên trang quản trị`.
- [ ] Thử thật (nếu có `LLM_API_KEY` trong `.env`): sinh 3 câu Part 2 rồi tạo audio; nghe thử file qua `/api/audio/<id>` bằng cách tải về (`curl -o`) và kiểm tra kích thước > 10 KB. Ghi vào report.

---

### Task 5: Audio nhóm phát một lần và Part 2 chỉ hiện chữ cái

**Files:**
- Modify: `AudioOnce.tsx`, `QuestionCard.tsx`, `ExamRunner.tsx`, `DrillRunner.tsx`
- Test: `AudioOnce.test.tsx`, `QuestionCard.test.tsx`, `ExamRunner.test.tsx`/`DrillRunner.test.tsx` (thêm case; nếu file test chưa có thì tạo tối thiểu cho case mới).

**Interfaces:**
```ts
// AudioOnce
type Props = { src: string; autoPlay?: boolean; played?: boolean; onPlayed?: (src: string) => void; onEnded?: () => void };
// state khởi tạo = played ? "done" : "idle"; khi play() thành công → setState("playing") và onPlayed?.(src)
// QuestionCard: thêm props { playedAudio?: ReadonlySet<string>; onAudioPlayed?: (src: string) => void; }
// render <AudioOnce key={audio} src={audio} played={playedAudio?.has(audio)} onPlayed={onAudioPlayed} autoPlay=... />
// Part 2: const hideChoiceText = q.section === "toeic.p2" && !reveal; khi hideChoiceText chỉ render <span>{LABELS[i]}</span>
```
- `ExamRunner`: state `played: string[]` đọc/ghi localStorage `attempt:${id}:played` cùng chỗ với `answers`/`flags`; xoá khi nộp. Bỏ `key={q.id}` trên `QuestionCard`. Truyền `playedAudio={new Set(played)}`, `onAudioPlayed`.
- `DrillRunner`: state `played` trong bộ nhớ; bỏ `key={q.id}`; vì `selected`/`reveal` là state của runner nên bỏ key không ảnh hưởng.

**Test cần có:** `AudioOnce`: `it("played=true thì nút phát bị vô hiệu và ghi Đã phát")`, `it("gọi onPlayed với src khi bấm phát")` (mock `HTMLMediaElement.prototype.play` trả Promise resolve). `QuestionCard`: `it("Part 2 chỉ hiện chữ cái khi chưa chấm")`, `it("Part 2 hiện nội dung sau khi chấm")`. `ExamRunner`: `it("chuyển câu trong cùng nhóm không tạo lại phần tử audio")` — render với 2 câu cùng `group.audioUrl`, lấy `container.querySelector("audio")`, bấm "Câu tiếp", phần tử `audio` vẫn là cùng một node (`toBe`).

**Bước:**
- [ ] Test đỏ → sửa → xanh. Commit: `fix: audio nhóm chỉ phát một lần khi chuyển câu, Part 2 chỉ hiện chữ cái`.

---

### Task 6: Quản trị bài đọc — danh sách, trạng thái, xoá, sửa

**Files:**
- Create: `src/features/reading/admin/list-readings-admin.ts`, `set-reading-status.ts`, `delete-reading.ts`, `get-reading-admin.ts`, `update-reading.ts`, `update-reading-schema.ts`; `src/components/admin/ReadingTable.tsx`, `ReadingAdminFilters.tsx`, `ReadingEditForm.tsx`; `src/app/admin/readings/page.tsx`, `src/app/admin/readings/[id]/page.tsx`
- Modify: `src/features/reading/get-reading.ts` (tách `toReadingForClient(row)`), `src/app/admin/actions.ts`, `src/app/admin/layout.tsx`
- Test: cạnh từng file.

**Interfaces:**
```ts
export type ReadingAdminRow = { id; title; genre; level; status: ContentStatus; source: QuestionSource; wordCount; sentenceCount: number; createdAt: Date };
export async function listReadingsAdmin(db: Pick<PrismaClient, "reading">, f: { status?; genre?; source?; q?; page?; pageSize? /* 50 */ }): Promise<{ items: ReadingAdminRow[]; total; page; pageSize }>;
// q: contains title, insensitive; orderBy createdAt desc; sentenceCount qua _count
export async function setReadingStatus(db, p: { id: string; status: ContentStatus }): Promise<void>;
export async function deleteReading(db: Pick<PrismaClient, "reading">, id: string): Promise<void>; // cascade xoá câu
export async function getReadingAdmin(db, id): Promise<(ReadingForClient & { status; source }) | null>; // mọi trạng thái, dùng toReadingForClient
export const updateReadingSchema = z.object({ title, genre, level, sourceName, sourceUrl: z.url({ protocol: /^https?$/ }).optional(), license, paragraphs: /* như readingFileSchema */ });
export async function updateReading(db: Pick<PrismaClient, "reading" | "readingSentence" | "$transaction">, id, input: UpdateReadingInput): Promise<void>;
// ném NOT_FOUND; $transaction([readingSentence.deleteMany({readingId}), readingSentence.createMany(...), reading.update({... wordCount})])
```
- Tính `wordCount`/`order`/`paragraphIndex` bằng **cùng hàm** với `importReading` — tách `flattenParagraphs(paragraphs)` ra `src/features/reading/flatten.ts` và dùng ở cả hai chỗ (không lặp logic).
- Actions: `setReadingStatusAction(formData)` (id, status), `deleteReadingAction(formData)` (id; form có `onSubmit` confirm ở client — dùng `window.confirm` trong `ReadingTable`), `updateReadingAction(_prev, formData)` parse: các trường phẳng + `paragraphs` gửi dưới dạng **một textarea JSON ẩn** do `ReadingEditForm` đóng gói từ các ô nhập (client giữ state mảng đoạn/câu, khi submit `JSON.stringify` vào `<input type="hidden" name="paragraphs">`).
- `ReadingEditForm` (client): ô tiêu đề, select thể loại/độ khó, nguồn, URL, giấy phép; với mỗi đoạn một khối có nút "Thêm câu", mỗi câu hai `textarea` (Anh, Việt) + nút "Xoá câu"; nút "Thêm đoạn"; nút "Lưu" (`useActionState`). Không kéo thả, không undo.
- `ReadingTable`: cột tiêu đề (link sửa), thể loại, độ khó, số câu, trạng thái, nguồn, thao tác (Đăng/Gỡ, Xoá, "Xem" link `/reading/[id]` chỉ khi PUBLISHED).
- `ReadingAdminFilters`: form GET: trạng thái, thể loại, nguồn, ô tìm.
- `layout.tsx`: thêm `{ href: "/admin/readings", label: "Bài đọc" }`.

**Test cần có:** `updateReading`: `it("thay toàn bộ câu trong một transaction và cập nhật wordCount")`, `it("NOT_FOUND khi bài không tồn tại")`; `listReadingsAdmin`: lọc + phân trang; `ReadingEditForm`: `it("thêm và xoá câu")`, `it("đóng gói paragraphs thành JSON khi gửi")`; actions: FORBIDDEN.

**Bước:**
- [ ] `flatten.ts` + refactor `import-reading.ts` (test cũ xanh).
- [ ] Nghiệp vụ + test. Giao diện + trang. Commit: `feat: quản trị bài đọc — danh sách, đăng/gỡ, xoá, sửa từng câu`.

---

### Task 7: Nhập bài đọc qua web và sinh bài đọc bằng AI

**Files:**
- Create: `src/features/admin/prompts/reading.ts`, `src/features/admin/generate-reading.ts`, `src/components/admin/ReadingImportForm.tsx`, `ReadingGenerateForm.tsx`, `src/app/admin/readings/import/page.tsx`, `src/app/admin/readings/generate/page.tsx`
- Modify: `src/features/admin/list-jobs.ts` (`listJobs(db, { type?, limit? })`), `src/app/admin/actions.ts`, `src/app/admin/readings/page.tsx` (hai nút tắt tới import/generate)
- Test: `prompts/reading.test.ts` (ví dụ qua `readingFileSchema`), `generate-reading.test.ts`, `list-jobs.test.ts`, action tests.

**Interfaces:**
```ts
// prompts/reading.ts
export type ReadingLength = "short" | "medium" | "long"; // ~150 / ~300 / ~500 từ
export function buildReadingPrompt(p: { genre: ReadingGenre; level: ReadingLevel; length: ReadingLength; topic?: string }): { system: string; user: string };
// Yêu cầu: viết tiếng Anh tự nhiên theo thể loại (HUMOR: truyện hài ngắn; FAIRY_TALE: cổ tích/ngụ ngôn kể lại, không nhân vật có bản quyền;
// ANIME: truyện phong cách anime nguyên tác; NEWS: bản tin giả định về sự kiện đời thường, KHÔNG nêu tên người/tổ chức có thật),
// độ khó theo CEFR, chia đoạn 3–6 câu, mỗi câu kèm bản dịch tiếng Việt tự nhiên; sourceName = "AI (do hệ thống tạo)",
// license = "Nội dung do AI tạo cho mục đích học tập", không có sourceUrl. Trả JSON đúng readingFileSchema.

// generate-reading.ts
export async function generateReading(db: Pick<PrismaClient, "generationJob" | "reading" | "readingSentence">, llm: LlmProvider,
  input: { genre; level; length; topic?; createdById }, deps?: { now?: () => Date }): Promise<{ jobId; status: "DONE" | "FAILED"; readingId?: string; error?: string }>;
// job type "reading", params { genre, level, length, topic }; askLlmJson(llm, prompt, readingFileSchema); ép genre/level theo input;
// importReading(db, data, { publish: false, source: "AI" }); resultCount = số câu.
```
- Actions: `importReadingAction(_prev, formData)` (giống `importAction`, trả `{ ok: true; readingId; sentences; published } | { ok: false; issues }`), `generateReadingAction(_prev, formData)` (schema genre/level/length/topic ≤ 100 ký tự; trả chuỗi "Đã tạo bài nháp: <title>" hoặc lỗi dịch tiếng Việt), `retryReadingJobAction(formData)`.
- Trang generate: `maxDuration = 60`; lịch sử job `type: "reading"`; link "Xem nháp" tới `/admin/readings?status=DRAFT&source=AI`. Trang `/admin/generate` cũ lọc `type: "questions"`.

**Test cần có:** `generateReading`: `it("ép genre/level theo input")`, `it("FAILED khi JSON sai hai lần, không ghi bài")`, `it("ghi job type reading và resultCount là số câu")`; `buildReadingPrompt`: chứa nhãn thể loại/độ khó/độ dài và ví dụ qua schema.

**Bước:**
- [ ] Prompt + test; nghiệp vụ + test; action + giao diện. Commit: `feat: nhập và sinh bài đọc bằng AI trên trang quản trị`.
- [ ] Thử thật nếu có `LLM_API_KEY`: sinh một bài `FAIRY_TALE`/`A2`/`short`, mở `/admin/readings/<id>` sửa thử, đăng, mở `/reading/<id>`. Ghi vào report.

---

### Task 8: Tài liệu

**Files:** `README.md`, `CLAUDE.md`, `.env.example` (không có biến TTS — ghi rõ), file kế hoạch này.

**Bước:**
- [ ] README: mục "Quản trị" thêm `/admin/readings*`, nút "Tạo audio", quy ước transcript (bảng nhỏ), Part 1 nhập file; xoá các mục nợ đã trả trong "Việc còn nợ" (audio nhóm Part 3/4, TTS), thêm nợ mới nếu có (audio trong Postgres — khi lớn thì chuyển sang storage ngoài).
- [ ] CLAUDE.md: đoạn "TTS và audio" (provider theo khuôn, `AudioFile` + `/api/audio`, `audioUrlSchema` nhận URL tương đối, `splitTranscript` là nơi duy nhất biết quy ước transcript, `generateAudio` là bước riêng); đoạn "Quản trị bài đọc" (`flatten.ts` dùng chung, `updateReading` transaction, `askLlmJson` dùng chung cho câu hỏi và bài đọc); cập nhật lệnh/lộ trình.
- [ ] Đánh dấu hoàn thành trong file kế hoạch. Commit: `docs: TTS, sinh Part 2-4 và quản trị bài đọc`.

---

## Việc hoãn lại (kế hoạch 8 / sau)

- Audio lưu Postgres: khi vượt vài trăm MB, chuyển `saveAudio` sang storage ngoài (S3) — chỉ đổi một hàm và route.
- Chèn khoảng lặng giữa các lượt nói (cần ghép MP3 có frame lặng).
- Sinh Part 1 (cần ảnh).
