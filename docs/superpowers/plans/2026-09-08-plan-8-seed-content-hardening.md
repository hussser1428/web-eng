# Kế hoạch 8: Dữ liệu ban đầu và chuẩn bị công khai

> Trạng thái: ĐÃ HOÀN THÀNH 2026-09-08 trên nhánh plan-8-seed. Kết quả: 299 câu (P1 6, P2 40, P3 45, P4 36, P5 80, P6 32, P7 60) đã đăng, 71 mục audio, 20 bài đọc, đề "Đề thi thử 1" 200 câu. Đọc mẫu: 40 câu 0 lỗi; 5 bài đọc → xoá 1 (nhân vật có bản quyền), sửa 1 lỗi dịch.

> **Dành cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để làm theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để đánh dấu.

**Mục tiêu:** Web có đủ nội dung để dùng ngay: ít nhất 1 đề thi thử đầy đủ 200 câu, ~300 câu luyện tập trải đủ Part 1–7 (Part 1–4 có audio), 20 bài đọc song ngữ; và các việc kỹ thuật phải xong trước khi công khai (rate limit dịch, dọn cache dịch, ghim image LibreTranslate).

**Kiến trúc:** Một script dòng lệnh `prisma/seed/generate-content.ts` gọi **đúng các hàm nghiệp vụ đã có** (`generateQuestions`, `generateAudio`, `generateReading`, `setQuestionStatus`, `setReadingStatus`, `buildExam`) theo lô, có chờ/thử lại khi LLM 503/429, chạy được nhiều lần (chỉ sinh phần còn thiếu so với chỉ tiêu). Logic quyết định "thiếu bao nhiêu, chia lô thế nào, bài đọc nào" là hàm thuần trong `src/features/admin/seed-plan.ts` có test; script chỉ là vòng lặp gọi. Part 1 (cần ảnh) làm tay: 6 ảnh public domain trên Wikimedia Commons + 4 câu mô tả mỗi ảnh trong một file JSON, nhập bằng lệnh có sẵn. Nội dung AI vào `DRAFT`, qua bước kiểm tra tự động (`check`) và một lượt đọc mẫu, rồi mới `publish` và ghép đề.

**Tech Stack:** như các kế hoạch trước; không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` mục 9 bước 8; README mục "Trước khi công khai".

**Không có migration.**

## Quyết định đã chốt

1. **Dữ liệu sống trong Postgres, không xuất ra JSON.** Audio là bytea nên xuất JSON không tiện; sao lưu/chuyển máy bằng `pg_dump`. README ghi lệnh. *(giả định)*
2. **Chỉ tiêu** (đếm cả DRAFT lẫn PUBLISHED, mọi nguồn): P1 6, P2 40, P3 45, P4 36, P5 80, P6 32, P7 60 ≈ 299 câu; bài đọc 20 (5 mỗi thể loại, độ khó xoay vòng A2→C1, độ dài xoay vòng short→long). Đề "Đề thi thử 1" ghép từ câu đã đăng bằng `buildExam` (đủ 200 câu theo spec). *(giả định)*
3. **Nội dung AI được đăng bằng script sau hai lớp kiểm tra**: (a) `check` tự động (đáp án trong khoảng, lựa chọn không trùng, Part 2 transcript đúng 4 dòng và A/B/C khớp `choices`, câu Listening có audio, `explanation`/`vi` có dấu tiếng Việt, bài đọc ≥ 8 câu); (b) một lượt đọc mẫu 40 câu + 5 bài do agent review làm, câu sai đáp án thì xoá. Người dùng vẫn là admin và có thể gỡ bất kỳ câu nào sau đó — quy tắc "AI phải qua admin duyệt" được nới cho đợt dữ liệu đầu để web dùng được ngay, ghi rõ trong README. *(giả định — người dùng nên xem lại)*
4. **Ảnh Part 1 hotlink từ `upload.wikimedia.org`**, chỉ chọn ảnh public domain hoặc CC0, ghi nguồn trong `explanation`. Không tải ảnh vào repo. *(giả định)*
5. **Rate limit dịch trong bộ nhớ** (một tiến trình): 30 request/phút mỗi IP, `x-forwarded-for` phần tử đầu, không có thì `"local"`. Đủ cho một VPS; nhiều tiến trình thì cần Redis — ghi `ponytail:`. *(giả định)*
6. **Dọn `TranslationCache` theo xác suất**: sau mỗi lần ghi cache mới, 1% xác suất xoá các dòng cũ hơn 90 ngày. Không cron. *(giả định)*
7. **Ghim image LibreTranslate** vào tag phiên bản mới nhất có trên Docker Hub lúc thực thi (tra bằng API tags), không dùng `latest`.
8. **Google OAuth không làm** — cần khoá thật của người dùng; README hướng dẫn.
9. **Không push, không deploy** — chưa được người dùng đồng ý.

## Ràng buộc chung

- Toàn bộ tiếng Việt (log của script cũng vậy). Script chỉ ở `prisma/seed/**`, được import `@prisma/client` và `../../src/...` như các script khác.
- Hàm thuần trong `src/features/admin/seed-plan.ts` có test; script không test (giống các script seed khác).
- LLM/TTS lỗi không làm hỏng cả đợt: ghi log, tiếp tục; chạy lại script sẽ bù phần thiếu.
- Không thêm dependency. Test/typecheck/lint sạch trước mỗi commit.

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `src/features/admin/seed-plan.ts` | `TARGETS`, `planBatches()`, `readingSpecs()` thuần. |
| `src/features/admin/content-check.ts` | `checkQuestion()`, `checkReading()` thuần → mảng lỗi. |
| `prisma/seed/generate-content.ts` | Script: `questions` \| `audio` \| `readings` \| `check` \| `publish` \| `exam` \| `all`. |
| `prisma/seed/fixtures/part1.json` | 6 câu Part 1 với ảnh Wikimedia. |
| `src/lib/rate-limit.ts` | `createRateLimiter()` thuần, test. |
| `src/app/api/translate/route.ts` | **Sửa:** 429 khi vượt. |
| `src/features/translate/translate.ts` | **Sửa:** dọn cache theo xác suất. |
| `docker-compose.yml` | **Sửa:** ghim tag. |
| `README.md`, `CLAUDE.md`, `package.json` | Lệnh `db:generate-content`, tài liệu. |

---

### Task 1: Hàm thuần lập kế hoạch sinh và kiểm tra nội dung

**Files:** Create `src/features/admin/seed-plan.ts`, `src/features/admin/content-check.ts` + test cạnh file.

**Interfaces:**
```ts
// seed-plan.ts
export const TARGETS: Record<string, number> = { "toeic.p1": 6, "toeic.p2": 40, "toeic.p3": 45, "toeic.p4": 36, "toeic.p5": 80, "toeic.p6": 32, "toeic.p7": 60 };
/** Chia phần thiếu thành các lô ≤ max. P3/P4 lô là bội của 3 (nhóm 3 câu, tối đa 3 nhóm = 9); P6 bội của 4 (tối đa 8). Trả [] khi đủ. */
export function planBatches(section: string, have: number, target = TARGETS[section], max = 10): number[];
export type ReadingSpec = { genre: ReadingGenre; level: ReadingLevel; length: "short" | "medium" | "long" };
/** 20 bài: thể loại xoay vòng HUMOR, FAIRY_TALE, ANIME, NEWS; độ khó xoay vòng A2,B1,B2,C1; độ dài short,medium,long. Xác định, không ngẫu nhiên. */
export function readingSpecs(count = 20): ReadingSpec[];

// content-check.ts
export type QuestionForCheck = { id; section; choices: string[]; answer: number; explanation: string; transcript: string | null; audioUrl: string | null; group: { transcript: string | null; audioUrl: string | null } | null };
export function checkQuestion(q: QuestionForCheck): string[]; // mã lỗi: ANSWER_OUT_OF_RANGE, DUPLICATE_CHOICES, EXPLANATION_NOT_VI, MISSING_AUDIO, P2_TRANSCRIPT_LINES, P2_CHOICES_MISMATCH
export function checkReading(r: { sentences: Array<{ en: string; vi: string }> }): string[]; // TOO_SHORT (<8), VI_NOT_VI (câu vi không có dấu), EN_HAS_VI (câu en có dấu tiếng Việt)
```
- "Có dấu tiếng Việt" dùng lại `direction.ts` (regex ký tự có dấu) — không viết regex mới.
- P2 khớp `choices`: so sánh sau `trim()` và bỏ dấu câu cuối, không phân biệt hoa thường.

**Test:** `planBatches`: `it("P5 thiếu 23 thì ra [10,10,3]")`, `it("P3 thiếu 10 thì ra [9,3]")`, `it("P6 thiếu 5 thì ra [8]")`, `it("đủ thì rỗng")`; `readingSpecs`: `it("20 bài, mỗi thể loại 5")`; `checkQuestion` mỗi mã một test; `checkReading` 3 test.

**Bước:** test đỏ → code → xanh; commit `feat: hàm lập kế hoạch sinh và kiểm tra nội dung ban đầu`.

---

### Task 2: Script sinh nội dung

**Files:** Create `prisma/seed/generate-content.ts`; Modify `package.json` (`"db:generate-content": "tsx prisma/seed/generate-content.ts"`).

**Hành vi:** `npm run db:generate-content -- <lệnh>`; lệnh:
- `questions`: với mỗi section trong `TARGETS` trừ `toeic.p1`: đếm câu hiện có (`question.count({ where: { section } })`), `planBatches`, với mỗi lô gọi `generateQuestions(prisma, llm, { section, count, createdById })`. `createdById` = user ADMIN đầu tiên (`user.findFirst({ where: { role: "ADMIN" } })`), không có thì user đầu tiên, không có thì thoát lỗi. Kết quả FAILED với `LLM_RATE_LIMITED`/`LLM_UNAVAILABLE` → chờ 30 s rồi thử lại tối đa 3 lần; `LLM_BAD_JSON` → bỏ lô, log. Giữa các lô chờ 4 s. Log mỗi lô: `[P5] lô 3/8: 10 câu (job ...)`.
- `audio`: lấy câu Listening thiếu audio (`listQuestions(prisma, { missingAudio: true, pageSize: 500 })`), gom `groupId ?? id`, chia lô 10 mục, gọi `generateAudio`; log `done/skipped/failed`; lỗi thì tiếp tục.
- `readings`: `readingSpecs(20)`, bỏ qua số bài đã có (`reading.count()`), với mỗi spec còn lại gọi `generateReading`; thử lại như trên; chờ 4 s.
- `check`: tải mọi câu (kèm group) và mọi bài (kèm sentences), chạy `checkQuestion`/`checkReading`, in bảng `id | section | lỗi`; thoát mã 1 nếu có lỗi. Cờ `--delete-bad` xoá các câu/bài lỗi (câu thuộc nhóm thì xoá cả nhóm).
- `publish`: `setQuestionStatus(prisma, { ids: <mọi câu DRAFT không lỗi>, status: "PUBLISHED" })` (tự chặn thiếu audio), `setReadingStatus` cho mọi bài DRAFT không lỗi. In số lượng.
- `exam`: `buildExam(prisma, { title: process.argv[3] ?? "Đề thi thử 1" })`; thiếu thì in bảng Part/cần/có, mã 1; đủ thì `setExamStatus` PUBLISHED và in id.
- `all`: `questions` → `audio` → `readings` → `check` (không xoá) — dừng trước `publish`.
- Đọc `.env` như các script khác (Prisma tự đọc; `LLM_*` qua `process.env` — script nhập `getLlmProvider()` từ `../../src/lib/providers/llm` và `getTtsProvider()`; thiếu LLM thì báo và thoát 1).

**Bước:** viết script; chạy khô `npm run db:generate-content -- check` trên DB hiện tại (phải chạy được, có thể báo lỗi ở 2 câu P2 cũ nếu thiếu gì); typecheck/lint; commit `feat: script sinh, kiểm tra và đăng nội dung ban đầu`.

---

### Task 3: Sáu câu Part 1 với ảnh Wikimedia Commons

**Files:** Create `prisma/seed/fixtures/part1.json`.

**Bước:**
- [x] Tìm 6 ảnh trên Wikimedia Commons bằng API (`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=...&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1024&format=json`), chỉ nhận `LicenseShortName` là `Public domain`, `CC0`; chủ đề kiểu TOEIC: người làm việc ở văn phòng, họp, kho hàng, nhà hàng, đường phố, công trường/xe cộ. Ảnh phải có người hoặc hành động rõ. Dùng URL `thumburl` 1024px.
- [x] Tải từng ảnh về thư mục tạm (không commit) và **xem ảnh** để viết đúng: 4 câu `A:`–`D:` (một câu đúng mô tả ảnh, ba câu sai kiểu TOEIC: hành động sai, vật sai, vị trí sai), `choices` = 4 câu không có tiền tố, `answer`, `explanation` tiếng Việt kèm "Ảnh: Wikimedia Commons, <tên file>, public domain/CC0", `transcript` 4 dòng `A: …`, `imageUrl`, `section: "toeic.p1"`, `skillTags: ["listening.detail"]`.
- [x] Kiểm tra file qua `npx tsx -e` với `questionFileSchema`; nhập bằng `npm run db:import-questions -- prisma/seed/fixtures/part1.json --draft`; ghi số câu.
- [x] Commit `feat: sáu câu Part 1 mẫu với ảnh public domain`.

---

### Task 4: Chạy sinh dữ liệu thật

**Bước (thực thi, không có code mới):**
- [x] `npm run db:generate-content -- questions 2>&1 | tee .superpowers/seed-questions.log` (chạy nền; ~35 lô, 20–40 phút). Ghi lại lô thất bại.
- [x] `npm run db:generate-content -- audio` (~80 mục).
- [x] `npm run db:generate-content -- readings` (20 bài).
- [x] Chạy lại `questions`/`audio`/`readings` nếu còn thiếu. Ghi tổng kết số lượng theo section vào report.

---

### Task 5: Kiểm tra chất lượng, đăng, ghép đề

**Bước:**
- [x] `npm run db:generate-content -- check`; xem danh sách lỗi; `--delete-bad` nếu lỗi là do model (không phải do bug kiểm tra).
- [x] Lượt đọc mẫu: xuất 40 câu ngẫu nhiên (đủ Part) + 5 bài đọc ra file tạm (JSON đầy đủ đáp án/giải thích) bằng `npx tsx -e`; một agent review (model mạnh) đọc và liệt kê câu **sai đáp án** hoặc **không thể trả lời**, bài đọc dịch sai nghĩa; xoá các mục đó bằng Prisma (`question.delete`/`questionGroup.delete`, `reading.delete`). Ghi tỉ lệ lỗi vào report; nếu > 15 % thì dừng và báo người dùng thay vì đăng.
- [x] `npm run db:generate-content -- publish`.
- [x] `npm run db:generate-content -- exam "Đề thi thử 1"`; nếu thiếu Part nào thì quay lại Task 4 cho Part đó.
- [x] Kiểm tra bằng `npm run dev` + Edge headless: `/exam` hiện đề, `/reading` hiện ≥ 20 bài, `/api/audio/<id>` trả `audio/mpeg`.

---

### Task 6: Rate limit dịch, dọn cache, ghim image

**Files:** Create `src/lib/rate-limit.ts` (+ test); Modify `src/app/api/translate/route.ts` (+ test), `src/features/translate/translate.ts` (+ test), `docker-compose.yml`, `src/lib/api-errors.ts` (thêm `RATE_LIMITED: 429`).

**Interfaces:**
```ts
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): { check(key: string): boolean };
// cửa sổ trượt đơn giản: Map<key, number[]> mốc thời gian; check() lọc mốc cũ, thêm mốc mới, trả false khi vượt limit; xoá key rỗng để Map không phình.
// ponytail: giới hạn trong bộ nhớ một tiến trình; nhiều tiến trình thì thay bằng Redis.
```
- Route: singleton `const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 })` ở module scope; key = `req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"`; vượt → `NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 })` trước khi parse body.
- `translateText`: sau khi ghi cache mới, `if ((deps.rand ?? Math.random)() < 0.01) await db.translationCache.deleteMany({ where: { createdAt: { lt: new Date(now - 90 ngày) } } })`; `now` tiêm được. Test: `rand: () => 0` gọi deleteMany, `rand: () => 0.5` không gọi.
- `docker-compose.yml`: tra `https://hub.docker.com/v2/repositories/libretranslate/libretranslate/tags?page_size=100` lấy tag `vX.Y.Z` mới nhất, ghim; README ghi cách nâng.

**Bước:** test đỏ → code → xanh; commit `feat: rate limit dịch, dọn cache dịch theo xác suất, ghim image LibreTranslate`.

---

### Task 7: Tài liệu

- [x] README: mục "Dữ liệu ban đầu" (lệnh `db:generate-content` từng bước, Part 1 thủ công, sao lưu `pg_dump`/`psql`), cập nhật "Chạy lần đầu" (bước sinh dữ liệu thay cho nhập mẫu), "Trước khi công khai" chỉ còn Google OAuth + đặt `AUTH_TRUST_HOST` + `pg_dump` định kỳ, ghi rõ đợt dữ liệu đầu được đăng bằng script sau kiểm tra tự động và đọc mẫu.
- [x] CLAUDE.md: lệnh mới; đoạn "Dữ liệu ban đầu": `seed-plan.ts`/`content-check.ts` thuần, script chỉ gọi hàm nghiệp vụ; rate limit trong bộ nhớ; dọn cache theo xác suất.
- [x] Đánh dấu hoàn thành; commit `docs: dữ liệu ban đầu và chuẩn bị công khai`.
