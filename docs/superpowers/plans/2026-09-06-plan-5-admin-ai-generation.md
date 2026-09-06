# Kế hoạch 5: Trang quản trị và sinh câu hỏi bằng AI

> **Dành cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để làm theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để đánh dấu.

**Mục tiêu:** Admin quản lý được kho câu hỏi ngay trên web thay vì chỉ qua dòng lệnh: xem, lọc, sửa, đăng, gỡ; nhập file JSON; ghép đề thi tự động từ câu đã đăng; và sinh câu hỏi Part 5, 6, 7 bằng LLM gói miễn phí, kết quả vào `DRAFT` chờ duyệt.

**Kiến trúc:** Module nghiệp vụ mới `src/features/admin/` (nhận `db` qua tham số, không import singleton). Trang `/admin/*` là server component; form gửi qua **Server Actions** trong `src/app/admin/actions.ts` (khuôn giống `(auth)/actions.ts`), mọi action đều đi qua `requireAdmin()`. Nhà cung cấp LLM nằm sau interface `LlmProvider` ở `src/lib/providers/llm/` theo đúng khuôn `translate`: factory nhận `fetchFn`/`timeoutMs`, `index.ts` đọc biến môi trường. Sinh câu hỏi **tái dùng toàn bộ đường nhập file**: prompt yêu cầu LLM trả JSON đúng `questionFileSchema`, kết quả qua Zod rồi vào `importQuestions()` — không viết lại logic ghi database.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Prisma 6 / PostgreSQL, Zod, Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 4.7 quản trị, mục 5 luồng tạo nội dung bằng AI, mục 7 xử lý lỗi LLM).

**Có một migration:** bảng `GenerationJob` (Task 7).

## Quyết định đã chốt

Ghi lại để người thực thi không tự ý làm khác. Các mục đánh dấu *(giả định)* là do agent lập kế hoạch chọn, người dùng chưa xác nhận — hỏi lại trước khi thực thi task liên quan nếu còn phân vân.

1. **Chỉ sinh Part 5, 6, 7 bằng AI trong kế hoạch này.** Part 1–4 cần audio (TTS) và ảnh; TTS để kế hoạch sau cùng với việc trả nợ audio nhóm Part 3/4 trong README. Không đưa TTS vào đây để kế hoạch không phình.
2. **Một triển khai LLM duy nhất kiểu OpenAI-compatible** (`POST {baseUrl}/chat/completions`). Groq, OpenRouter và Gemini đều có endpoint tương thích, nên đổi nhà cung cấp chỉ cần đổi `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. **Không thêm SDK**, gọi bằng `fetch`. *(giả định)*
3. **Sinh đồng bộ trong một request, tối đa 10 câu mỗi lô** (spec nói 20; hạ xuống để vừa giới hạn thời gian request khi lên Vercel). Vẫn có bảng `GenerationJob` để lưu lịch sử, lỗi và nút chạy lại; **không dựng hàng đợi nền** — spec mục 5 bước 2 có nhắc hàng đợi trong bộ nhớ, đây là YAGNI có chủ ý. *(giả định)*
4. **Không cho đăng câu Listening thiếu audio** (spec mục 7). Quy tắc nằm trong `set-question-status.ts`, không ở giao diện.
5. **Ghép đề tự động phải đủ đúng số câu mỗi Part** theo `CertificateSpec`; thiếu thì báo rõ Part nào thiếu bao nhiêu, không tạo đề lệch. Câu có `groupId` được lấy nguyên nhóm.
6. **Cấp quyền admin bằng script dòng lệnh** (`npm run db:make-admin -- email`), không có giao diện tự phong admin.
7. **Không làm trong kế hoạch này:** quản lý bài đọc (chưa có bảng `Reading`, thuộc kế hoạch đọc song ngữ), sửa từ điển, tải file audio/ảnh lên, sửa đề thi chọn tay từng câu.

## Ràng buộc chung

Mọi task đều phải tuân thủ các điều dưới đây; phần **Yêu cầu** của từng task ngầm bao gồm mục này.

- **Toàn bộ tiếng Việt:** giao diện, thông báo lỗi, tên test, comment, commit message.
- **Phân lớp:** hàm trong `src/features/*` **luôn nhận `db` qua tham số**, gõ kiểu hẹp bằng `Pick<PrismaClient, ...>`. Chỉ `src/app/**` mới import `@/lib/prisma`, `@/lib/auth`, `@/lib/providers/*`.
- **Mọi action và trang dưới `/admin` phải qua `requireAdmin()`** (Task 1). Không kiểm tra `role` lẻ tẻ ở từng file.
- **Không rò đáp án xuống client ở trang người học** — không đổi. Trang admin thì **được** hiện `answer`/`explanation`, vì chỉ admin thấy; nhưng component admin đặt trong `src/components/admin/` để không lẫn với `components/questions/`.
- **LLM là dịch vụ ngoài:** không tin kết quả; luôn qua Zod, thử lại đúng một lần khi sai định dạng, ghi lỗi vào `GenerationJob.error` bằng mã (`LLM_BAD_JSON`, `LLM_RATE_LIMITED`, `LLM_UNAVAILABLE`, `INVALID_SECTION:...`). Provider **không bao giờ ném lỗi thô** ra ngoài, chỉ ném `Error` có message là mã.
- **Test nghiệp vụ dùng fake `db`**, test provider dùng `fetchFn` giả, không mock module. Test Server Action: `vi.mock("@/lib/auth")` và `vi.mock("@/lib/prisma")`, thêm `// @vitest-environment node`.
- **Ngẫu nhiên và thời gian phải tiêm được:** `rand?: () => number`, `now?: Date`.
- **Bảng màu hiện hành:** `bg-background`, `.card`, `text-muted`, `border-line`, `bg-surface-2`, `.text-accent` / `.btn-primary`, `text-danger`, `text-info`. Không `neon`, không `.glow`.
- **Không dùng emoji trong giao diện.** Icon từ `lucide-react`, `size={18}`/`size={20}`, `aria-hidden="true"`.
- **Không thêm dependency mới.**
- Mỗi task kết thúc bằng: `npm test`, `npm run typecheck`, `npm run lint` sạch (được phép còn đúng 1 warning `<img>` đã biết ở `QuestionCard.tsx`), rồi commit.

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `prisma/seed/make-admin.ts` | Script: đặt `role = ADMIN` cho một email. |
| `src/lib/require-admin.ts` | `requireAdmin()`: đọc `auth()`, không phải ADMIN thì `redirect("/")` (trang) hoặc ném `Error("FORBIDDEN")` (action). |
| `src/features/admin/count-questions.ts` | Đếm câu theo section × trạng thái cho trang tổng quan. |
| `src/features/admin/list-questions.ts` | Danh sách câu hỏi có lọc (section, trạng thái, nguồn, tìm trong stem) và phân trang. |
| `src/features/admin/get-question.ts` | Một câu kèm nhóm, đầy đủ `answer`/`explanation` cho form sửa. |
| `src/features/admin/update-question.ts` | Sửa nội dung một câu; kiểm tra số lựa chọn theo `CertificateSpec`, `answer` trong khoảng. |
| `src/features/admin/set-question-status.ts` | Đăng/gỡ một hoặc nhiều câu; chặn đăng câu Listening thiếu audio. |
| `src/features/admin/build-exam.ts` | Ghép đề tự động từ câu đã đăng, đủ số câu mỗi Part, lấy nguyên nhóm. |
| `src/features/admin/list-exams.ts` | Danh sách đề kèm số câu và trạng thái. |
| `src/features/admin/set-exam-status.ts` | Đăng/gỡ đề. |
| `src/features/questions/import-questions.ts` | **Sửa:** nhận thêm `source: QuestionSource` (mặc định `IMPORT`). |
| `src/lib/providers/llm/types.ts` | `interface LlmProvider { generateJson(input): Promise<unknown> }`. |
| `src/lib/providers/llm/openai-compatible.ts` | Factory gọi `/chat/completions`, ép JSON, map 429/timeout sang mã lỗi. |
| `src/lib/providers/llm/index.ts` | Đọc `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, cache instance; thiếu key thì trả `null`. |
| `src/features/admin/prompts/part5.ts`, `part6.ts`, `part7.ts` | Prompt mẫu từng Part, kèm ví dụ JSON đầu ra chuẩn. |
| `src/features/admin/prompts/index.ts` | `buildPrompt(section, { count, skillTag })`. |
| `src/features/admin/generate-questions.ts` | Luồng: tạo job → gọi LLM → Zod → thử lại một lần → `importQuestions(source: "AI")` → cập nhật job. |
| `src/features/admin/list-jobs.ts` | Lịch sử job sinh câu hỏi. |
| `src/app/admin/actions.ts` | Server Actions: sửa câu, đổi trạng thái, nhập file, ghép đề, sinh câu hỏi, chạy lại job. |
| `src/app/admin/layout.tsx` | Khung `/admin`: `requireAdmin()` + thanh điều hướng phụ (Tổng quan, Câu hỏi, Nhập file, Đề thi, Sinh bằng AI). |
| `src/app/admin/page.tsx` | Tổng quan: bảng section × trạng thái. Thay `ComingSoon`. |
| `src/app/admin/questions/page.tsx` | Danh sách + bộ lọc + đăng/gỡ hàng loạt. |
| `src/app/admin/questions/[id]/page.tsx` | Form sửa một câu. |
| `src/app/admin/import/page.tsx` | Dán JSON hoặc chọn file; báo lỗi theo dòng. |
| `src/app/admin/exams/page.tsx` | Danh sách đề, nút ghép đề tự động, đăng/gỡ. |
| `src/app/admin/generate/page.tsx` | Form sinh câu hỏi + lịch sử job + nút chạy lại. |
| `src/components/admin/AdminNav.tsx` | Thanh điều hướng phụ (client, `aria-current`). |
| `src/components/admin/QuestionFilters.tsx` | Bộ lọc dạng form GET. |
| `src/components/admin/QuestionTable.tsx` | Bảng câu hỏi, checkbox chọn nhiều, nút đăng/gỡ. |
| `src/components/admin/QuestionForm.tsx` | Form sửa câu (client, `useActionState`). |
| `src/components/admin/ImportForm.tsx` | Textarea JSON + kết quả/lỗi. |
| `src/components/admin/GenerateForm.tsx` | Chọn Part, skillTag, số câu; hiện kết quả job. |

---

### Task 1: Cấp quyền admin và khung trang `/admin`

**Files:**
- Create: `prisma/seed/make-admin.ts`, `src/lib/require-admin.ts`, `src/app/admin/layout.tsx`, `src/components/admin/AdminNav.tsx`
- Modify: `package.json` (script `db:make-admin`), `src/app/admin/page.tsx` (tạm giữ `ComingSoon`, bỏ kiểm tra role vì layout đã lo)
- Test: `src/lib/require-admin.test.ts`, `src/components/admin/AdminNav.test.tsx`

**Interfaces:**
- `requireAdmin(mode: "page" | "action" = "page"): Promise<{ id: string }>` — trả `{ id }` của admin; `page` thì `redirect("/")`, `action` thì ném `Error("FORBIDDEN")`.
- `AdminNav({ links })` — mảng `{ href, label }`, đánh dấu `aria-current="page"` theo `usePathname()` như `NavBar`.

**Test cần có:**
- `it("chuyển về trang chủ khi chưa đăng nhập")`, `it("chuyển về trang chủ khi là USER")`, `it("ném FORBIDDEN ở chế độ action")`, `it("trả id khi là ADMIN")`.
- `AdminNav`: đánh dấu đúng link đang mở.

**Bước:**
- [ ] Viết `make-admin.ts` theo khuôn `import-questions.ts`: nhận email, `prisma.user.update`, in "Đã cấp quyền admin cho ...", không tìm thấy thì báo lỗi và exit 1.
- [ ] `require-admin.ts` với `vi.mock("@/lib/auth")` và `vi.mock("next/navigation")` trong test.
- [ ] `layout.tsx`: gọi `requireAdmin()`, render `AdminNav` + `{children}` trong `max-w-6xl`. Đặt `data-no-translate` để popup dịch không nhảy ra khi admin bôi đen nội dung.
- [ ] Commit: `feat: cấp quyền admin bằng script và khung trang quản trị`.

---

### Task 2: Tổng quan kho câu hỏi

**Files:**
- Create: `src/features/admin/count-questions.ts`
- Modify: `src/app/admin/page.tsx`
- Test: `src/features/admin/count-questions.test.ts`

**Interfaces:**
- `countQuestions(db: Pick<PrismaClient, "question">, certificate = "toeic"): Promise<Array<{ section: string; name: string; required: number; draft: number; published: number }>>` — dùng `groupBy` theo `section, status`; luôn trả đủ mọi section trong `CertificateSpec` kể cả khi 0 câu; `required` là `questionCount` của section.

**Test cần có:** section không có câu vẫn xuất hiện với 0/0; gộp đúng draft/published; bỏ qua section lạ không có trong spec.

**Bước:**
- [ ] Hàm + test với fake `db.question.groupBy`.
- [ ] Trang tổng quan: bảng Part | Đã đăng | Nháp | Cần cho một đề; tô `text-danger` khi `published < required`. Ba nút tắt tới `/admin/questions`, `/admin/import`, `/admin/generate`.
- [ ] Commit: `feat: trang tổng quan kho câu hỏi cho admin`.

---

### Task 3: Danh sách câu hỏi có lọc và đổi trạng thái

**Files:**
- Create: `src/features/admin/list-questions.ts`, `src/features/admin/set-question-status.ts`, `src/components/admin/QuestionFilters.tsx`, `src/components/admin/QuestionTable.tsx`, `src/app/admin/questions/page.tsx`, `src/app/admin/actions.ts`
- Test: cạnh từng file; `actions.test.ts` cho action đổi trạng thái.

**Interfaces:**
- `listQuestions(db, filter: { certificate?; section?; status?; source?; q?; page?: number; pageSize?: number }): Promise<{ items: QuestionRow[]; total: number; page; pageSize }>` với `QuestionRow = { id, section, status, source, stem, answer, choices, hasAudio, groupId, updatedAt }`. `q` tìm `contains` không phân biệt hoa thường trong `stem`. `pageSize` mặc định 50.
- `setQuestionStatus(db, { ids: string[]; status: ContentStatus; certificate? }): Promise<{ updated: number; blocked: string[] }>` — với `PUBLISHED`: câu thuộc section `hasAudio` mà thiếu cả `audioUrl` của câu lẫn `audioUrl` của nhóm thì **không** đăng, trả về trong `blocked`. Tra `hasAudio` qua `getSection()`.
- Action `setStatusAction(formData)`: đọc `ids[]` và `status`, gọi `requireAdmin("action")`, `revalidatePath("/admin/questions")`, trả chuỗi thông báo ("Đã đăng 12 câu, 3 câu Listening thiếu audio không đăng được").

**Test cần có:**
- `listQuestions`: lọc từng tiêu chí, phân trang `skip/take` đúng, `hasAudio` = câu hoặc nhóm có audio.
- `setQuestionStatus`: `it("không đăng câu Part 2 thiếu audio")`, `it("đăng được câu Part 3 khi nhóm có audio")`, `it("gỡ thì không kiểm tra audio")`.
- Action: `it("ném FORBIDDEN khi không phải admin")`.

**Bước:**
- [ ] Hai hàm nghiệp vụ + test.
- [ ] `QuestionFilters`: form `method="GET"` với select section (từ `TOEIC.sections`), trạng thái, nguồn, ô tìm; giữ giá trị từ `searchParams`.
- [ ] `QuestionTable`: bảng, checkbox chọn nhiều, hai nút "Đăng" / "Gỡ" gửi `setStatusAction`; mỗi dòng link tới `/admin/questions/[id]`; nhãn trạng thái màu (`text-info` nháp, `text-accent` đã đăng); cảnh báo "thiếu audio" bằng icon `VolumeX`.
- [ ] Trang server đọc `searchParams`, gọi `listQuestions(prisma, ...)`, phân trang bằng link `?page=`.
- [ ] Commit: `feat: danh sách câu hỏi có lọc, đăng và gỡ hàng loạt`.

---

### Task 4: Form sửa một câu hỏi

**Files:**
- Create: `src/features/admin/get-question.ts`, `src/features/admin/update-question.ts`, `src/features/admin/update-question-schema.ts`, `src/components/admin/QuestionForm.tsx`, `src/app/admin/questions/[id]/page.tsx`
- Modify: `src/app/admin/actions.ts` (thêm `updateQuestionAction`)
- Test: cạnh từng file.

**Interfaces:**
- `getQuestion(db, id): Promise<(Question & { group: QuestionGroup | null }) | null>`.
- `updateQuestion(db, id, input: { stem?; choices: string[]; answer: number; explanation: string; skillTags: string[]; audioUrl?; imageUrl?; transcript? }): Promise<void>` — ném `NOT_FOUND`, `INVALID_CHOICES` (số lựa chọn khác `choiceCount` của section), `INVALID_ANSWER` (ngoài khoảng). Zod schema tách ra `update-question-schema.ts` để action và hàm dùng chung.
- Action `updateQuestionAction(_prev, formData)`: parse → gọi hàm → `revalidatePath` → trả `null` khi xong hoặc chuỗi lỗi tiếng Việt.

**Test cần có:** `it("INVALID_ANSWER khi answer vượt số lựa chọn")`, `it("INVALID_CHOICES khi số lựa chọn khác Part")`, form hiện lỗi từ action, nút "Lưu" bị vô hiệu khi đang gửi.

**Bước:**
- [ ] Hàm + schema + test.
- [ ] `QuestionForm` (client, `useActionState`): textarea stem, 3–4 ô lựa chọn theo section (số ô cố định, không cho thêm/bớt), radio đáp án, textarea giải thích, skillTags dạng chuỗi phân cách dấu phẩy, ô audioUrl/imageUrl/transcript. Hiện đoạn văn/transcript của nhóm ở trên (chỉ đọc).
- [ ] Trang `[id]`: `notFound()` nếu không có.
- [ ] Commit: `feat: form sửa câu hỏi cho admin`.

---

### Task 5: Nhập file JSON qua giao diện

**Files:**
- Create: `src/components/admin/ImportForm.tsx`, `src/app/admin/import/page.tsx`
- Modify: `src/features/questions/import-questions.ts` (thêm `source`), `src/app/admin/actions.ts` (`importAction`)
- Test: cập nhật `import-questions.test.ts` (source), `ImportForm.test.tsx`, `actions.test.ts`.

**Interfaces:**
- `importQuestions(db, data, opts: { publish: boolean; examTitle?: string; source?: QuestionSource })` — mặc định `"IMPORT"` để script CLI không đổi.
- Action `importAction(_prev, formData)` trả `{ ok: true; questions; groups; examId } | { ok: false; issues: string[] }`. `issues` là mảng chuỗi `"questions.3.answer: answer phải nhỏ hơn số lựa chọn"` lấy từ `zod.issues`, và mã lỗi nghiệp vụ (`INVALID_SECTION:toeic.p9`) dịch sang tiếng Việt.

**Bước:**
- [ ] Sửa `importQuestions` + test `it("ghi source AI khi được truyền")`.
- [ ] `ImportForm`: textarea dán JSON, `<input type="file" accept=".json">` đọc bằng `FileReader` rồi đổ vào textarea, checkbox "Đăng ngay" (mặc định **tắt** — vào nháp), ô "Tạo đề tên..." tuỳ chọn. Kết quả hiện danh sách lỗi theo dòng hoặc thông báo thành công kèm link tới danh sách.
- [ ] Trang import: mô tả ngắn schema và nhắc file mẫu `prisma/seed/fixtures/questions-sample.json`.
- [ ] Commit: `feat: nhập câu hỏi từ JSON ngay trên trang quản trị`.

---

### Task 6: Ghép đề tự động và quản lý đề

**Files:**
- Create: `src/features/admin/build-exam.ts`, `src/features/admin/list-exams.ts`, `src/features/admin/set-exam-status.ts`, `src/app/admin/exams/page.tsx`
- Modify: `src/app/admin/actions.ts` (`buildExamAction`, `setExamStatusAction`)
- Test: cạnh từng file.

**Interfaces:**
- `buildExam(db: Pick<PrismaClient, "question" | "exam" | "examQuestion">, input: { certificate?: string; title: string; rand?: () => number }): Promise<{ ok: true; examId: string } | { ok: false; error: "NOT_ENOUGH_QUESTIONS"; shortage: Array<{ section: string; need: number; have: number }> }>`.
  - Với mỗi section: lấy câu `PUBLISHED` của section kèm `groupId`. Câu lẻ (không nhóm) là "nhóm cỡ 1". Xáo trộn danh sách nhóm bằng `rand`, gom lần lượt; bỏ qua nhóm làm vượt `questionCount`; dừng khi đủ. Không đủ ⇒ ghi vào `shortage`, **không** tạo gì.
  - Thứ tự câu trong đề: theo thứ tự section trong spec, trong nhóm giữ nguyên thứ tự `createdAt`.
  - Đề tạo ở `DRAFT`.
- `listExams(db): Promise<Array<{ id; title; status; questionCount; createdAt }>>`.
- `setExamStatus(db, { id; status })`.

**Test cần có:**
- `it("lấy nguyên nhóm Part 3, không cắt nhóm")`, `it("báo thiếu đúng Part và số lượng khi không đủ")`, `it("không tạo đề khi chỉ một Part thiếu")`, `it("khoá được kết quả bằng rand")`, `it("thứ tự câu đi từ Part 1 đến Part 7")`.

**Bước:**
- [ ] `build-exam.ts` + test kỹ vì đây là logic khó nhất kế hoạch.
- [ ] Trang `/admin/exams`: form một ô tên đề + nút "Ghép tự động"; kết quả lỗi thiếu hiện bảng Part/cần/có. Bảng đề: tên, số câu, trạng thái, nút đăng/gỡ, link mở `/exam/[id]`.
- [ ] Commit: `feat: ghép đề thi tự động từ câu đã đăng`.

---

### Task 7: Nhà cung cấp LLM và bảng `GenerationJob`

**Files:**
- Create: `src/lib/providers/llm/types.ts`, `openai-compatible.ts`, `index.ts`; migration `generation_job`
- Modify: `prisma/schema.prisma`, `.env.example`, `README.md` (biến môi trường)
- Test: `openai-compatible.test.ts`

**Schema:**
```prisma
enum JobStatus { PENDING RUNNING DONE FAILED }

model GenerationJob {
  id          String    @id @default(cuid())
  type        String    // "questions"
  params      Json      // { certificate, section, count, skillTag }
  status      JobStatus @default(PENDING)
  error       String?
  resultCount Int       @default(0)
  createdById String
  createdAt   DateTime  @default(now())
  finishedAt  DateTime?

  @@index([createdAt])
}
```

**Interfaces:**
- `interface LlmProvider { generateJson(input: { system: string; user: string; maxTokens?: number }): Promise<unknown> }` — trả object đã `JSON.parse`; ném `Error("LLM_BAD_JSON")` khi không parse được, `Error("LLM_RATE_LIMITED")` khi HTTP 429, `Error("LLM_UNAVAILABLE")` cho mọi lỗi mạng/HTTP khác/timeout.
- `createOpenAiCompatible(opts: { baseUrl; apiKey; model; fetchFn?; timeoutMs? (mặc định 60000) })`: gửi `{ model, messages, response_format: { type: "json_object" }, temperature: 0.7 }`; đọc `choices[0].message.content`; cắt bỏ rào markdown ` ```json ` nếu model vẫn trả kèm.
- `getLlmProvider(): LlmProvider | null` — `null` khi thiếu `LLM_API_KEY`; trang sinh câu hỏi hiện "Chưa cấu hình LLM" thay vì lỗi 500.

**Test cần có:** map 429 → `LLM_RATE_LIMITED`; 500 → `LLM_UNAVAILABLE`; nội dung không phải JSON → `LLM_BAD_JSON`; bóc được JSON trong rào markdown; gửi đúng `Authorization: Bearer`; timeout huỷ request.

**Bước:**
- [ ] Provider + test với `fetchFn` giả (khuôn `libretranslate.test.ts`).
- [ ] Schema + `npm run db:migrate` (tên `generation_job`).
- [ ] `.env.example`: `LLM_BASE_URL="https://api.groq.com/openai/v1"`, `LLM_API_KEY=""`, `LLM_MODEL="llama-3.3-70b-versatile"`, kèm comment các endpoint thay thế (OpenRouter `https://openrouter.ai/api/v1`, Gemini `https://generativelanguage.googleapis.com/v1beta/openai`).
- [ ] Commit: `feat: nhà cung cấp LLM kiểu OpenAI-compatible và bảng GenerationJob`.

---

### Task 8: Prompt và luồng sinh câu hỏi

**Files:**
- Create: `src/features/admin/prompts/{part5,part6,part7,index}.ts`, `src/features/admin/generate-questions.ts`, `src/features/admin/list-jobs.ts`
- Test: `prompts/index.test.ts`, `generate-questions.test.ts`

**Interfaces:**
- `buildPrompt(section: "toeic.p5" | "toeic.p6" | "toeic.p7", opts: { count: number; skillTag?: string }): { system: string; user: string }` — ném `UNSUPPORTED_SECTION` với section khác. Prompt (viết bằng tiếng Anh cho model, nhưng yêu cầu `explanation` **tiếng Việt**) mô tả đúng schema của `questionFileSchema`: Part 5 là `questions` lẻ 4 lựa chọn; Part 6 là một `groups[]` với `passage` có 4 chỗ trống `(1)…(4)` và 4 câu `groupKey`; Part 7 là 1–2 `groups` với `passage` (email, thông báo, quảng cáo) và 2–5 câu mỗi nhóm. Mỗi prompt kèm **ví dụ JSON đầy đủ** trong file để model bám theo. Yêu cầu `skillTags` lấy từ danh sách gợi ý cố định (ví dụ `grammar.tense`, `grammar.preposition`, `vocab.collocation`, `reading.inference`, `reading.detail`).
- `generateQuestions(db: Pick<PrismaClient, "generationJob" | "questionGroup" | "question" | "exam" | "examQuestion">, llm: LlmProvider, input: { section; count; skillTag?; createdById; certificate? }, deps?: { now?: () => Date }): Promise<{ jobId: string; status: "DONE" | "FAILED"; resultCount: number; error?: string }>`:
  1. `count` kẹp trong `[1, 10]`.
  2. Tạo job `RUNNING`.
  3. Gọi `llm.generateJson(buildPrompt(...))`; parse bằng `questionFileSchema` (ép `certificate` và `section` theo input, không tin model).
  4. Sai Zod hoặc `LLM_BAD_JSON` ⇒ **thử lại đúng một lần**, lần hai thêm vào `user` đoạn "Lần trước JSON không hợp lệ: …" với 3 issue đầu.
  5. Thành công ⇒ `importQuestions(db, data, { publish: false, source: "AI" })`, job `DONE`, `resultCount`.
  6. Thất bại ⇒ job `FAILED`, `error` là mã; **không** ghi câu nào.
  7. `LLM_RATE_LIMITED` ⇒ không thử lại, ghi lỗi ngay.
- `listJobs(db, limit = 20)`.

**Test cần có:**
- `it("thử lại một lần khi JSON sai rồi thành công")`, `it("FAILED sau hai lần JSON sai, không ghi câu")`, `it("không thử lại khi hết hạn mức")`, `it("ép section theo input dù model trả section khác")`, `it("kẹp count về 10")`, `it("ghi source AI và status DRAFT")`.
- `buildPrompt`: có chứa số câu, skillTag, và ví dụ JSON parse được bằng `questionFileSchema` (test này bảo đảm ví dụ trong prompt không bị lệch schema khi sau này sửa schema).

**Bước:**
- [ ] Prompt ba Part; test ví dụ đầu ra qua schema.
- [ ] `generate-questions.ts` + test với fake `llm` (`vi.fn()` trả lần lượt) và fake `db`.
- [ ] Commit: `feat: sinh câu hỏi Part 5-7 bằng LLM, kết quả vào nháp`.

---

### Task 9: Trang sinh câu hỏi bằng AI

**Files:**
- Create: `src/components/admin/GenerateForm.tsx`, `src/app/admin/generate/page.tsx`
- Modify: `src/app/admin/actions.ts` (`generateAction`, `retryJobAction`)
- Test: `GenerateForm.test.tsx`, cập nhật `actions.test.ts`.

**Bước:**
- [ ] Action `generateAction(_prev, formData)`: `requireAdmin("action")`, `getLlmProvider()` null ⇒ trả "Chưa cấu hình LLM (LLM_API_KEY)"; gọi `generateQuestions`; trả thông báo "Đã tạo 8 câu nháp" hoặc lỗi dịch sang tiếng Việt (`LLM_RATE_LIMITED` ⇒ "Hết hạn mức, thử lại sau vài phút"). Đặt `export const maxDuration = 60` ở trang.
- [ ] `retryJobAction(jobId)`: đọc `params` của job cũ, gọi lại `generateQuestions` tạo job mới.
- [ ] `GenerateForm` (client, `useActionState`): select Part 5/6/7, ô skillTag (datalist gợi ý), số câu 1–10, nút "Sinh" vô hiệu khi đang chạy kèm dòng "Đang gọi LLM, khoảng 20–40 giây…".
- [ ] Trang: form + bảng lịch sử job (thời gian, Part, số câu, trạng thái, lỗi, nút "Chạy lại" cho `FAILED`), link "Xem nháp" tới `/admin/questions?status=DRAFT&source=AI`.
- [ ] Commit: `feat: trang sinh câu hỏi bằng AI với lịch sử job`.

---

### Task 10: Tài liệu

**Files:**
- Modify: `README.md`, `CLAUDE.md`, đánh dấu hoàn thành trong file kế hoạch này.

**Bước:**
- [ ] README: mục "Quản trị" (cấp admin bằng script, các trang, biến môi trường LLM, lô tối đa 10 câu), cập nhật "Việc còn nợ" (TTS cho Part 1–4 chưa có; Part 1–4 chỉ nhập file/thủ công).
- [ ] CLAUDE.md: thêm đoạn "Quản trị và LLM" — `requireAdmin()` bắt buộc, Server Actions ở `admin/actions.ts`, sinh câu hỏi tái dùng `importQuestions`, provider LLM theo khuôn `translate`, lỗi LLM là mã.
- [ ] Commit: `docs: hướng dẫn quản trị và sinh câu hỏi bằng AI`.

---

## Việc hoãn lại (ghi để kế hoạch sau nhặt)

- TTS (Edge TTS) cho Part 1–4 và sinh câu hỏi Listening; đi cùng việc trả nợ audio nhóm Part 3/4 trong `QuestionCard`/`ExamRunner`.
- Tải audio/ảnh lên (`FileStorage` local + S3) — cần cho Part 1 thủ công.
- Chọn tay từng câu khi tạo đề; sửa đề đã tạo.
- Hàng đợi nền cho job dài (nếu lên VPS thay vì Vercel).
- Quản lý bài đọc: thuộc kế hoạch đọc song ngữ.
