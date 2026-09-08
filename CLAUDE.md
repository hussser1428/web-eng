# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ngôn ngữ

Toàn bộ dự án dùng tiếng Việt: giao diện, thông báo lỗi, tên test (`it("400 khi rỗng")`), comment, docs, commit message. Giữ nguyên quy ước này khi viết code mới.

## Lệnh

```bash
npm run dev              # dev server (localhost:3000)
npm test                 # Vitest, chạy một lần
npm run test:watch
npm test -- src/features/dictionary/normalize.test.ts   # một file
npm test -- -t "400 khi rỗng"                            # một test theo tên
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run build

npm run db:up            # chỉ Postgres (docker compose up -d db)
npm run db:migrate       # prisma migrate dev
npm run db:studio
npm run db:import-dict -- data/star_anhviet   # nhập từ điển StarDict vào bảng Word
npm run db:import-questions -- <file.json> [--exam "Tên"] [--draft]   # nhập câu hỏi/đề
npm run db:import-reading -- <file.json> [--draft]   # nhập bài đọc song ngữ
npm run db:make-admin -- <email>   # cấp quyền ADMIN cho một tài khoản
npm run db:generate-content -- <questions|audio|readings|check|publish|exam|all>   # sinh dữ liệu ban đầu bằng LLM + TTS (xem README)
```

Node 22, npm (không dùng yarn/pnpm). `docker compose up -d` chạy cả Postgres lẫn LibreTranslate; LibreTranslate tải model en/vi lần đầu mất vài phút.

## Kiến trúc

Next.js 15 App Router + TypeScript + Tailwind 4 + Prisma/PostgreSQL + Auth.js v5. Alias `@/*` → `src/*`.

**Phân lớp — quy tắc quan trọng nhất của repo:**

- `src/features/*` — nghiệp vụ thuần TypeScript. **Luôn nhận `db` qua tham số**, gõ kiểu hẹp bằng `Pick<PrismaClient, "word" | "translationCache">` chứ không import `prisma` singleton. Nhờ vậy unit test dùng fake object, không cần Postgres.
- `src/components/layout/*` — khung giao diện: `SiteHeader` (server, đọc `auth()`) → `NavBar` (client: menu, aria-current, ☰ di động), `ComingSoon` cho trang chưa dựng, `AuthCard` + class dùng chung cho form đăng nhập/đăng ký. Phong cách nền tối neon: token màu và class dùng chung (`.card`, `.btn-neon`, `.text-neon`, `.glow`) trong `globals.css`; font Be Vietnam Pro.
- `src/lib/*` — hạ tầng: `prisma.ts` (singleton), `auth.ts` (cấu hình Auth.js), `password.ts`, `providers/`.
- `src/lib/providers/<loại>/` — mỗi dịch vụ ngoài nằm sau một interface (`types.ts`) + factory nhận `fetchFn`/`timeoutMs` để test được, và `index.ts` đọc biến môi trường rồi cache instance. Hiện có `translate` (LibreTranslate); spec dự kiến thêm `llm`, `tts`, `storage` theo cùng khuôn.
- `src/app/api/*/route.ts` — lớp mỏng: `zod` parse body → `auth()` → gọi hàm trong `features` với `prisma` thật → map lỗi sang HTTP status. Không viết nghiệp vụ ở đây.
- `src/app/(auth)/actions.ts` — Server Actions cho đăng ký/đăng nhập, trả về chuỗi lỗi tiếng Việt cho `useActionState`.

**Luồng popup dịch** (`src/components/translate-popup/`): `use-selection.ts` lắng nghe `mouseup`/`touchend` toàn document (debounce 150ms, bỏ qua target trong `[data-translate-popup]`, `input`/`textarea`, `[data-no-translate]`) → `TranslatePopup.tsx` POST `/api/translate` → `translateText()` quyết định: một từ tiếng Anh thì tra bảng `Word` (`kind: "word"`, kèm nút lưu), còn lại thì đọc `TranslationCache` rồi mới gọi LibreTranslate. Provider lỗi/timeout ⇒ `kind: "unavailable"`, không ném lỗi ra ngoài. Popup gắn ở `src/app/layout.tsx` nên có mặt trên mọi trang.

**Chứng chỉ & làm bài:** quy tắc từng chứng chỉ (phần thi, số câu, thời gian, quy đổi điểm) là object `CertificateSpec` trong `src/features/certificates/<mã>.ts`; database chỉ lưu chuỗi `certificate` ("toeic") và `section` ("toeic.p5"). Một lượt làm bài = `Attempt` + các `AttemptAnswer` tạo sẵn lúc bắt đầu (`start-drill.ts`, `start-exam.ts`); drill chấm từng câu (`answer-drill.ts`), thi lưu đáp án hàng loạt (`save-exam-answers.ts`) rồi chấm khi nộp (`submit.ts`). DTO xuống client qua `questions/dto.ts` không bao giờ chứa `answer`/`explanation`. Route handler map mã lỗi bằng `src/lib/api-errors.ts`. Vùng thi có `data-no-translate`.

**Từ vựng và SM-2:** `src/features/vocab/sm2.ts` là hàm thuần duy nhất biết công thức SM-2 — không chạm database, không đọc đồng hồ. `review-word.ts` mới là chỗ quy `intervalDays` ra mốc `dueAt` và áp quy tắc ôn sớm (dueAt cũ còn ở tương lai thì lấy mốc sớm hơn giữa lịch cũ và lịch mới). Sửa công thức thì sửa `sm2.ts`, sửa cách hẹn lịch thì sửa `review-word.ts`. Phiên ôn dựng sẵn một lần bằng `start-session.ts` rồi trang server truyền thẳng xuống component client. Câu trắc nghiệm **không gửi đáp án xuống client**: `choices` chỉ là mảng chuỗi (không gắn `id` từ nguồn — nếu gắn thì lựa chọn đúng có `id === wordId`, mở DevTools là thấy), client gửi lên chuỗi đã chọn, server tra từ rồi so với `meaningVi`/`headword` thật trong `answer-quiz.ts`. Bảng `VocabQuizAnswer` trong spec cố tình chưa dựng — SM-2 cập nhật thẳng trên `UserWord`.

**Xử lý lỗi:** hàm nghiệp vụ trả union result (`{ ok: false, error: "EMAIL_TAKEN" }`) hoặc ném `Error` với message dạng mã (`"EMPTY"`, `"TEXT_TOO_LONG"`, `"TRANSLATE_UNAVAILABLE"`); route handler dịch mã đó sang status. Lỗi Prisma bắt qua `Prisma.PrismaClientKnownRequestError` + `e.code` (`P2002` trùng, `P2003` khoá ngoại sai).

**Tra từ:** `normalize.ts::candidateForms()` sinh danh sách dạng gốc theo thứ tự ưu tiên (số nhiều, `-ed`, `-ing`, phụ âm gấp đôi); `lookup.ts` truy vấn một lần với `headword: { in: forms }` rồi chọn theo đúng thứ tự đó. Sửa quy tắc hình thái ở `normalize.ts`, không sửa `lookup.ts`.

**Chiều dịch:** `direction.ts` chỉ dò ký tự có dấu tiếng Việt — không có dấu thì mặc định en→vi.

**Quản trị và LLM:** mọi trang `/admin/*` và mọi Server Action trong `src/app/admin/actions.ts` phải gọi `requireAdmin()` trước (`"page"` redirect về `/`, `"action"` ném `Error("FORBIDDEN")`) — không kiểm tra `role` lẻ tẻ ở nơi khác. `actions.ts` chỉ parse input rồi gọi hàm trong `src/features/admin/*`, không viết nghiệp vụ ở đó. Sinh câu hỏi bằng AI **không tự ghi database**: prompt (`src/features/admin/prompts/part2..7.ts`, số câu tối đa `MAX_COUNT` ở `prompts/limits.ts`, mỗi prompt kèm ví dụ JSON được test khớp `questionFileSchema`) yêu cầu LLM trả đúng định dạng nhập file, qua Zod rồi gọi thẳng `importQuestions()` (`source: "AI"`) — tái dùng toàn bộ đường nhập, không có logic ghi câu hỏi riêng cho AI. `askLlmJson()` trong `src/features/admin/llm-json.ts` là nơi DUY NHẤT thử lại khi LLM trả sai định dạng (đúng một lần, kèm ghi chú lỗi cho model), dùng chung cho cả sinh câu hỏi lẫn sinh bài đọc (`generate-reading.ts` gọi nó rồi `importReading(source: "AI")`, cùng khuôn với câu hỏi). Provider LLM (`src/lib/providers/llm/`) theo đúng khuôn `translate`: interface + factory nhận `fetchFn`/`timeoutMs`, `index.ts` đọc biến môi trường và cache instance, thiếu `LLM_API_KEY` thì trả `null` thay vì ném lỗi. Lỗi LLM luôn là mã (`LLM_BAD_JSON`, `LLM_RATE_LIMITED`, `LLM_UNAVAILABLE`) ghi vào `GenerationJob.error`; sai định dạng thử lại đúng một lần, hết hạn mức thì không thử lại. Role nằm trong JWT (sao vào lúc đăng nhập), nên đổi role trong database chỉ có hiệu lực sau khi người dùng đăng nhập lại.

**TTS và audio:** provider TTS (`src/lib/providers/tts/`) theo đúng khuôn `translate`/`llm` — interface `TtsProvider.synthesize({ text, voice })`, factory `createEdgeTts()` bọc gói `msedge-tts` (không đọc biến môi trường, TTS luôn "sẵn sàng"), `index.ts::getTtsProvider()` cache instance. File audio lưu trong bảng `AudioFile` (bytea) qua `saveAudio()`, phục vụ công khai bằng `GET /api/audio/[id]` (`Cache-Control: immutable`). `audioUrlSchema` (`src/features/audio/audio-url.ts`) nhận URL http(s) tuyệt đối **hoặc** đường dẫn tương đối `/api/audio/<id>` — dùng ở cả `import-schema.ts` lẫn `update-question-schema.ts`. `splitTranscript()` (`src/features/admin/tts/segments.ts`) là nơi DUY NHẤT biết quy ước transcript theo Part (tiền tố `M:`/`W:`/`Q:`/`A:`-`D:`); sửa quy ước thì sửa ở đây. `generateAudio()` (`src/features/admin/tts/generate-audio.ts`, `MAX_TTS_ITEMS = 10`) là bước riêng do admin bấm ở `/admin/questions`, không tự chạy sau khi LLM sinh transcript; câu trong cùng nhóm (Part 3/4) tổng hợp chung một file, dedupe theo `groupId`. Trên trang học, `AudioOnce` (`src/components/questions/AudioOnce.tsx`) được `key={src}` thay vì `key={q.id}`, nên chuyển câu trong cùng nhóm không phát lại; trạng thái "đã phát" runner tự giữ theo `src` (thi: localStorage `attempt:<id>:played`). Part 2 trên trang học chỉ hiện chữ cái A/B/C, hiện nội dung sau khi chấm — chỉ đổi giao diện, DTO không đổi.

**Dữ liệu ban đầu và chuẩn bị công khai:** `src/features/admin/seed-plan.ts` (`TARGETS` số câu mục tiêu mỗi section, `planBatches()` chia phần thiếu thành lô — P3/P4 bội của 3, P6 bội của 4 —, `readingSpecs()` lưới thể loại × trình độ × độ dài) và `content-check.ts` (`checkQuestion`/`checkReading` trả mảng mã lỗi như `MISSING_AUDIO`, `P2_CHOICES_MISMATCH`, `TOO_SHORT`) là hàm thuần, test không cần database. Script `prisma/seed/generate-content.ts` chỉ gọi lại các hàm nghiệp vụ sẵn có (`generateQuestions`, `generateAudio`, `generateReading`, `setQuestionStatus`, `buildExam`…) — không có đường ghi dữ liệu riêng; mỗi lệnh chỉ làm phần còn thiếu nên chạy lại được, LLM quá tải thì chờ 30 s thử lại tối đa 3 lần. `check --delete-bad` chỉ xoá bản nháp có lỗi khác `MISSING_AUDIO`, không đụng bản đã đăng. Rate limit `/api/translate` là `createRateLimiter()` trong `src/lib/rate-limit.ts` (cửa sổ trượt, trong bộ nhớ một tiến trình — nhiều instance thì chuyển sang Redis), route trả 429 `RATE_LIMITED`. `translateText()` nhận thêm `rand`/`now` để mỗi lần ghi cache mới có 1 % xác suất xoá `TranslationCache` quá 90 ngày — không có cron.

**Đọc song ngữ:** file nhập theo đoạn (`paragraphs: Array<Array<{ en, vi }>>`), `flattenParagraphs()` (`src/features/reading/flatten.ts`) trải đoạn thành câu và tính `order` (liên tục qua mọi đoạn), `paragraphIndex` (vị trí đoạn), `wordCount` — dùng chung cho cả nhập file (`import-reading.ts`) lẫn sửa bài (`update-reading.ts`) để hai đường ghi không lệch cách tính. Trang đọc là lưới theo đoạn (`md:grid-cols-2`), không có JS cuộn đồng bộ — hai cột tự thẳng hàng. Mỗi câu tiếng Anh là `<span data-translate-context data-order={order}>` để popup dịch lấy câu làm ngữ cảnh (sửa quy tắc `blockContext()` trong `src/components/translate-popup/selection-utils.ts`). Cột tiếng Việt có `data-no-translate` để popup không hiện khi bôi đen tiếng Việt. `getReading()` chỉ trả bài `PUBLISHED`. Trang `[id]` gộp hai lần gọi (metadata + dữ liệu) bằng React `cache()`. Nghiệp vụ quản trị bài đọc (`src/features/reading/admin/*`) tách khỏi nghiệp vụ trang đọc công khai: `listReadingsAdmin`, `getReadingAdmin`, `setReadingStatus`, `deleteReading`, `updateReading` — riêng `updateReading` thay **toàn bộ** câu của bài trong một `$transaction` (xoá hết rồi `createMany` lại), không cập nhật lẻ từng câu.

## Test

Vitest + jsdom mặc định (`globals: true`, setup `@testing-library/jest-dom`). File test nằm cạnh file nguồn. Test route handler cần môi trường Node: thêm `// @vitest-environment node` ở dòng đầu và `vi.mock` các module `@/lib/*`. Test nghiệp vụ thì truyền fake `db` thay vì mock.

## Tài liệu & lộ trình

- Spec: `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mô hình dữ liệu đầy đủ cho đề thi, SM-2, bài đọc song ngữ — phần lớn chưa dựng).
- Kế hoạch đã xong: `docs/superpowers/plans/2026-09-03-plan-1-foundation-dictionary.md` (từ điển), `docs/superpowers/plans/2026-09-06-plan-5-admin-ai-generation.md` (trang quản trị, sinh câu hỏi bằng AI), `docs/superpowers/plans/2026-09-07-plan-6-bilingual-reading.md` (đọc song ngữ), `docs/superpowers/plans/2026-09-08-plan-7-tts-listening-reading-admin.md` (TTS, sinh Part 2–4 bằng AI, quản trị bài đọc), `docs/superpowers/plans/2026-09-08-plan-8-seed-content-hardening.md` (dữ liệu ban đầu, rate limit, dọn cache).
- README liệt kê việc phải làm trước khi công khai (Google OAuth thật, `AUTH_TRUST_HOST`, sao lưu `pg_dump`) và "Việc còn nợ" (transaction cho nhập/ghép đề, audio lưu Postgres khi lớn thì chuyển storage ngoài, LLM chưa thử lại khi 503).

Ràng buộc xuyên suốt: vận hành không tốn phí AI (LibreTranslate tự cài, phát âm bằng Web Speech API của trình duyệt). Nội dung sinh bằng AI phải qua admin duyệt — ngoại lệ duy nhất là đợt dữ liệu đầu, đăng bằng script sau kiểm tra tự động và đọc mẫu.

## Môi trường

`.env` (xem `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `LIBRETRANSLATE_URL`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, và `AUTH_TRUST_HOST="true"` khi chạy production ngoài Vercel. Thư mục `data/` (file từ điển StarDict) đã gitignore — tải theo `prisma/seed/fixtures/README.md`.
