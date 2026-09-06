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
npm run db:make-admin -- <email>   # cấp quyền ADMIN cho một tài khoản
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

**Quản trị và LLM:** mọi trang `/admin/*` và mọi Server Action trong `src/app/admin/actions.ts` phải gọi `requireAdmin()` trước (`"page"` redirect về `/`, `"action"` ném `Error("FORBIDDEN")`) — không kiểm tra `role` lẻ tẻ ở nơi khác. `actions.ts` chỉ parse input rồi gọi hàm trong `src/features/admin/*`, không viết nghiệp vụ ở đó. Sinh câu hỏi bằng AI **không tự ghi database**: prompt (`src/features/admin/prompts/part5|6|7.ts`, số câu tối đa `MAX_COUNT` ở `prompts/limits.ts`, mỗi prompt kèm ví dụ JSON được test khớp `questionFileSchema`) yêu cầu LLM trả đúng định dạng nhập file, qua Zod rồi gọi thẳng `importQuestions()` (`source: "AI"`) — tái dùng toàn bộ đường nhập, không có logic ghi câu hỏi riêng cho AI. Provider LLM (`src/lib/providers/llm/`) theo đúng khuôn `translate`: interface + factory nhận `fetchFn`/`timeoutMs`, `index.ts` đọc biến môi trường và cache instance, thiếu `LLM_API_KEY` thì trả `null` thay vì ném lỗi. Lỗi LLM luôn là mã (`LLM_BAD_JSON`, `LLM_RATE_LIMITED`, `LLM_UNAVAILABLE`) ghi vào `GenerationJob.error`; sai định dạng thử lại đúng một lần, hết hạn mức thì không thử lại. Role nằm trong JWT (sao vào lúc đăng nhập), nên đổi role trong database chỉ có hiệu lực sau khi người dùng đăng nhập lại.

## Test

Vitest + jsdom mặc định (`globals: true`, setup `@testing-library/jest-dom`). File test nằm cạnh file nguồn. Test route handler cần môi trường Node: thêm `// @vitest-environment node` ở dòng đầu và `vi.mock` các module `@/lib/*`. Test nghiệp vụ thì truyền fake `db` thay vì mock.

## Tài liệu & lộ trình

- Spec: `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mô hình dữ liệu đầy đủ cho đề thi, SM-2, bài đọc song ngữ — phần lớn chưa dựng).
- Kế hoạch đã xong: `docs/superpowers/plans/2026-09-03-plan-1-foundation-dictionary.md` (từ điển), `docs/superpowers/plans/2026-09-06-plan-5-admin-ai-generation.md` (trang quản trị, sinh câu hỏi bằng AI).
- README liệt kê việc phải làm trước khi công khai (rate limit `/api/translate`, TTL cho `TranslationCache`, ghim version image LibreTranslate, Google OAuth thật) và "Việc còn nợ" (TTS cho Part 1–4, transaction cho nhập/ghép đề, rate limit sinh câu hỏi bằng AI).

Ràng buộc xuyên suốt: vận hành không tốn phí AI (LibreTranslate tự cài, phát âm bằng Web Speech API của trình duyệt). Nội dung sinh bằng AI phải qua admin duyệt.

## Môi trường

`.env` (xem `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `LIBRETRANSLATE_URL`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, và `AUTH_TRUST_HOST="true"` khi chạy production ngoài Vercel. Thư mục `data/` (file từ điển StarDict) đã gitignore — tải theo `prisma/seed/fixtures/README.md`.
