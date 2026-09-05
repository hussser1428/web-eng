# Thiết kế: Web luyện thi TOEIC (Listening & Reading)

Ngày: 2026-09-03
Trạng thái: đã duyệt ý tưởng; kế hoạch 1 và giao diện khung đã xong. Cập nhật 2026-09-05: mô hình dữ liệu sẵn chỗ cho nhiều chứng chỉ (xem mục 3.1).

## 1. Mục tiêu

Web học tiếng Anh công khai, nhiều người dùng, tập trung luyện thi TOEIC Listening & Reading. Điểm khác biệt: phân tích dạng câu hỏi người học hay sai và sinh bài luyện đúng điểm yếu. Bổ sung kho từ vựng với ôn tập ngắt quãng, trắc nghiệm từ vựng hai chiều, popup dịch khi bôi đen, và bài đọc song ngữ Anh-Việt.

Ràng buộc quan trọng:

- Vận hành không tốn phí AI: LLM dùng gói miễn phí (Gemini, Groq, OpenRouter), dịch bằng LibreTranslate tự cài, audio bằng Edge TTS.
- Nội dung tạo bằng AI phải qua admin duyệt trước khi công khai.
- Chỉ TOEIC L&R. Không có Speaking/Writing trong phạm vi này, nhưng schema không cản trở việc thêm sau.
- Dữ liệu câu hỏi, đề thi, lượt làm bài đều gắn mã chứng chỉ để sau này thêm chứng chỉ khác (IELTS, TOEFL dạng trắc nghiệm) mà không sửa schema. Giao diện phiên bản này chỉ hiện TOEIC.

Ngoài phạm vi (không làm ở phiên bản này): giao diện chọn chứng chỉ, AI chấm Speaking/Writing, lộ trình học tự động, thanh toán, cộng đồng đóng góp nội dung.

## 2. Kiến trúc tổng thể

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS**. Một codebase cho giao diện và API (Route Handlers / Server Actions).
- **PostgreSQL + Prisma** làm database.
- **Auth.js** (NextAuth v5): đăng nhập email/mật khẩu và Google. Vai trò `USER` và `ADMIN`.
- **Dịch vụ ngoài**, mỗi loại nằm sau một giao diện chung để đổi nhà cung cấp bằng cấu hình:
  - `LlmProvider`: `generate(prompt, schema)`; triển khai ban đầu: Gemini, Groq, OpenRouter. Chọn bằng biến môi trường `LLM_PROVIDER`.
  - `TranslateProvider`: `translate(text, from, to)`; triển khai: LibreTranslate.
  - `TtsProvider`: `synthesize(text, voice)`; triển khai: Edge TTS. Giọng: en-US, en-GB, en-AU.
- **Lưu file** (audio, ảnh): giao diện `FileStorage` với hai triển khai: thư mục local (`/public/uploads`) và S3-compatible.
- **Triển khai**: Vercel hoặc VPS cho app; Postgres trên Neon/Supabase hoặc cùng VPS; LibreTranslate chạy Docker trên VPS.

Cấu trúc thư mục dự kiến:

```
src/
  app/               # routes (App Router)
    (auth)/          # login, register
    (main)/          # dashboard, exam, drill, vocab, reading
    admin/           # quản trị
    api/             # route handlers
  components/        # UI dùng chung (popup dịch, player audio, timer...)
  features/          # nghiệp vụ theo module: exam, drill, vocab, reading, admin
  lib/               # prisma client, auth, providers (llm, translate, tts, storage)
  scoring/           # quy đổi điểm, SM-2, thống kê điểm yếu (thuần TS, dễ test)
prisma/
  schema.prisma
  seed/              # dữ liệu ban đầu: từ điển StarDict, đề mẫu
docs/superpowers/specs/
```

## 3. Mô hình dữ liệu

### 3.1 Chứng chỉ và phần thi

Mỗi chứng chỉ có một mã (`certificate`, chuỗi: `"toeic"`, sau này `"ielts"`, ...) và các phần thi (`section`, chuỗi dạng `"<certificate>.<phần>"`: `"toeic.p1"` … `"toeic.p7"`). Không dùng số Part thuần vì chứng chỉ khác không có Part 1–7.

Quy tắc của từng chứng chỉ nằm trong code, thuần TypeScript, không trong database: `src/features/certificates/<mã>.ts` xuất một object `CertificateSpec`:

- `id`, `name` (tên hiển thị).
- `sections`: danh sách `{ id, name, skill: "listening" | "reading", questionCount, hasAudio, hasImage, choiceCount }`. TOEIC: p1 6 câu (4 lựa chọn, có ảnh và audio), p2 25 (3 lựa chọn, audio), p3 39 và p4 30 (4 lựa chọn, audio), p5 30, p6 16, p7 54 (4 lựa chọn, đọc).
- `timeLimits`: thời gian mỗi kỹ năng (TOEIC: listening 45 phút chạy theo audio, reading 75 phút).
- `score(correctBySection)`: nhận số câu đúng theo phần, trả về `{ parts: Record<string, number>, total: number }` (TOEIC: listening 5–495, reading 5–495, tổng cộng hai phần).

`src/features/certificates/index.ts` xuất `getCertificate(id)` và danh sách. Thêm chứng chỉ = thêm một file + dữ liệu câu hỏi; không cần migration.

### Người dùng

- `User`: id, email, passwordHash (nullable nếu đăng nhập Google), name, role (`USER` | `ADMIN`), createdAt.
- `Account`, `Session`, `VerificationToken`: theo chuẩn Auth.js.

### Ngân hàng câu hỏi

- `Question`:
  - id, certificate (chuỗi, mặc định `"toeic"`), section (chuỗi, ví dụ `"toeic.p5"`; index), status (`DRAFT` | `PUBLISHED`)
  - `groupId` (nullable): các câu cùng đoạn hội thoại (Part 3, 4) hoặc cùng đoạn văn (Part 6, 7) trỏ về một `QuestionGroup`
  - stem (nội dung câu hỏi; Part 1, 2 có thể rỗng vì chỉ có audio)
  - choices: JSON mảng 3 hoặc 4 lựa chọn
  - answer: chỉ số đáp án đúng
  - explanation: giải thích tiếng Việt
  - skillTags: mảng chuỗi, ví dụ `["grammar.relative-clause"]`, `["reading.inference"]`
  - audioUrl (nullable), imageUrl (nullable)
  - transcript (nullable): kịch bản audio, dùng cho giải thích và tạo TTS
  - source: `AI` | `IMPORT` | `MANUAL`
  - createdAt, updatedAt
- `QuestionGroup`: id, certificate, section, passage (văn bản Part 6, 7) hoặc transcript (Part 3, 4), audioUrl, imageUrl.
- `Exam`: id, certificate, title, status, createdAt. `ExamQuestion`: examId, questionId, order. Số câu mỗi phần lấy từ `CertificateSpec.sections` (TOEIC đủ 200 câu: p1 6, p2 25, p3 39, p4 30, p5 30, p6 16, p7 54).

### Lượt làm bài

- `Attempt`: id, userId, certificate, type (`EXAM` | `DRILL`), examId (nullable), startedAt, submittedAt (nullable), scores (JSON `{ parts: Record<string, number>, total: number }`, null cho drill), config (JSON: section, skillTags, số câu cho drill). Index (userId, certificate, submittedAt).
- `AttemptAnswer`: attemptId, questionId, chosen (nullable nếu bỏ trống), isCorrect, order.

### Từ vựng

- `Word`: id, headword (unique, lowercase), phonetic, pos (loại từ), meaningVi, exampleEn, exampleVi, cefr (nullable). Nhập từ StarDict Anh-Việt.
- `UserWord`: userId, wordId, sourceContext (câu chứa từ khi lưu), easeFactor, intervalDays, repetitions, dueAt, createdAt. Unique (userId, wordId).
- `VocabQuizAnswer`: userId, wordId, direction (`EN_TO_VI` | `VI_TO_EN`), isCorrect, answeredAt. Dùng để cập nhật SM-2 và thống kê.

### Bài đọc song ngữ

- `Reading`: id, title, genre (`HUMOR` | `FAIRY_TALE` | `ANIME` | `NEWS`), level (`A2` | `B1` | `B2` | `C1`), sourceName, sourceUrl (nullable), license (chuỗi ghi nguồn), status, wordCount, createdAt.
- `ReadingSentence`: readingId, order, paragraphIndex, en, vi.

### Dịch

- `TranslationCache`: hash(text, from, to) làm khóa, text, from, to, result, createdAt.

## 4. Các module và màn hình

### 4.1 Dashboard (`/`)

- Mọi số liệu lọc theo chứng chỉ đang ôn (phiên bản này cố định `toeic`).
- Điểm ước tính từ lần thi thử gần nhất (`Attempt.scores`).
- Bản đồ điểm yếu: biểu đồ tỷ lệ đúng theo section và theo skillTag trong 30 ngày.
- Gợi ý hôm nay: ba skillTag có tỷ lệ đúng thấp nhất (tối thiểu 5 câu đã làm), mỗi gợi ý là link mở drill tương ứng.
- Số từ đến hạn ôn, link sang trang từ vựng.

### 4.2 Thi thử (`/exam`, `/exam/[id]`, `/exam/[id]/result`)

- Danh sách đề đã đăng của chứng chỉ đang ôn.
- Màn làm bài đọc cấu trúc và thời gian từ `CertificateSpec`: phần có audio chạy audio tự động, mỗi audio phát một lần, không cho tua lại; hết phần nghe chuyển sang phần đọc có đồng hồ (TOEIC: 75 phút). Cho phép đánh dấu câu để xem lại trong phần Reading.
- Câu trả lời được lưu vào localStorage sau mỗi lần chọn và đồng bộ lên server mỗi 30 giây; nộp lại khi có mạng nếu mất kết nối.
- Kết quả: điểm từng phần, tổng, danh sách câu với đáp án và giải thích, lọc theo câu sai.

### 4.3 Drill (`/drill`)

- Chọn section (hiển thị theo tên trong `CertificateSpec`), tùy chọn skillTag, số câu (10, 20, 30).
- Câu hỏi lấy ngẫu nhiên trong câu đã đăng, ưu tiên câu người dùng chưa làm hoặc đã làm sai.
- Sau mỗi câu hiện ngay đúng/sai và giải thích. Kết thúc có tổng kết.

### 4.4 Từ vựng (`/vocab`)

- Danh sách từ đã lưu, tìm kiếm, xóa.
- Ôn thẻ: hiện từ, lật để xem nghĩa, tự đánh giá (quên / khó / dễ) để cập nhật SM-2.
- Trắc nghiệm hai chiều:
  - `EN_TO_VI`: hiện từ tiếng Anh, chọn 1 trong 4 nghĩa tiếng Việt.
  - `VI_TO_EN`: hiện nghĩa tiếng Việt, chọn 1 trong 4 từ tiếng Anh.
  - Ba đáp án nhiễu lấy từ bảng `Word` cùng loại từ, ưu tiên từ người dùng cũng đã lưu, không trùng nghĩa với đáp án đúng.
  - Từ trả lời sai được đặt lại `intervalDays = 1`, `repetitions = 0`.

### 4.5 Đọc song ngữ (`/reading`, `/reading/[id]`)

- Danh sách bài, lọc theo thể loại và độ khó.
- Trang đọc:
  - Desktop: hai cột, trái tiếng Anh, phải tiếng Việt, cuộn đồng bộ theo đoạn. Rê chuột hoặc chạm vào một câu thì câu cùng `order` ở cột kia được tô nền.
  - Mobile (dưới 768px): mỗi đoạn tiếng Anh theo sau là đoạn tiếng Việt; có nút ẩn/hiện tiếng Việt.
  - Popup dịch hoạt động trong cột tiếng Anh; nút lưu từ ghi `sourceContext` là câu chứa từ.
  - Ghi nguồn và giấy phép ở cuối bài.

### 4.6 Popup dịch (component dùng chung)

- Lắng nghe sự kiện bôi đen văn bản trên toàn bộ trang chính (trừ input và vùng làm bài thi đang tính giờ, để tránh gian lận).
- Xác định chiều dịch: nếu văn bản chứa ký tự tiếng Việt có dấu thì dịch Việt sang Anh, ngược lại Anh sang Việt.
- Quy trình:
  1. Nếu là một từ tiếng Anh: tra bảng `Word` (chuẩn hóa lowercase, thử dạng gốc đơn giản bằng cách bỏ đuôi s/es/ed/ing). Có thì hiện phiên âm, loại từ, nghĩa, ví dụ.
  2. Nếu không có hoặc là cụm từ/câu: kiểm tra `TranslationCache`, không có thì gọi LibreTranslate, lưu cache.
  3. Giới hạn 500 ký tự mỗi lần dịch.
- Popup hiện phía trên vùng bôi đen, có nút "Lưu từ" (chỉ với từ đơn tiếng Anh có trong `Word`) và nút phát âm (dùng Web Speech API của trình duyệt, không tốn phí).
- Người chưa đăng nhập vẫn dịch được nhưng không lưu từ.

### 4.7 Quản trị (`/admin`, chỉ `ADMIN`)

- **Câu hỏi**: bảng lọc theo chứng chỉ, section, trạng thái, nguồn. Sửa, duyệt, đăng, gỡ.
- **Tạo bằng AI**: chọn Part, skillTag, số lượng (tối đa 20 mỗi lô), giọng TTS. Xem tiến trình, kết quả vào `DRAFT`.
- **Nhập từ file**: JSON hoặc CSV theo schema công bố; kiểm tra Zod, báo lỗi theo dòng.
- **Dán thủ công**: form tạo một câu hoặc một nhóm câu, tải audio/ảnh lên hoặc bấm tạo TTS từ transcript.
- **Đề thi**: tạo đề bằng cách chọn tự động từ câu đã đăng theo đúng số lượng mỗi Part, hoặc chọn tay.
- **Bài đọc**: tạo bằng AI (thể loại, độ khó, độ dài), nhập từ file, dán thủ công (dán tiếng Anh, hệ thống tách câu và dịch, admin sửa từng câu). Duyệt và đăng.
- **Từ điển**: nhập StarDict một lần bằng script seed; admin có thể sửa từng từ.

## 5. Luồng tạo nội dung bằng AI

1. Admin chọn loại nội dung và tham số, bấm tạo.
2. Server tạo `GenerationJob` (id, type, params, status, error, createdAt) và chạy nền trong cùng tiến trình (hàng đợi trong bộ nhớ, tối đa một job chạy cùng lúc). Khi lên Vercel, giới hạn mỗi job trong một request và xử lý lô nhỏ.
3. Gọi `LlmProvider.generate` với prompt mẫu theo Part hoặc thể loại, yêu cầu JSON đúng schema. Kết quả qua Zod; lỗi định dạng thì thử lại một lần.
4. Với câu hỏi Listening: gọi `TtsProvider` cho transcript, lưu file, gắn `audioUrl`. Part 1 cần ảnh: tạm dùng ảnh do admin tải lên, AI chỉ sinh câu mô tả; Part 1 do đó được ưu tiên nhập thủ công.
5. Với bài đọc: LLM viết tiếng Anh; server tách câu bằng thư viện tách câu; LLM dịch theo lô câu (giữ số lượng và thứ tự), kiểm tra số câu khớp.
6. Lưu ở `DRAFT`, admin xem và sửa rồi đăng.

Prompt mẫu lưu trong `src/features/admin/prompts/` để dễ chỉnh. Mỗi prompt kèm ví dụ đầu ra chuẩn.

Giấy phép nội dung: bài lấy từ nguồn mở (Project Gutenberg, VOA Learning English, Wikinews) ghi rõ `sourceName`, `sourceUrl`, `license`. Thể loại anime và hài do AI viết, không dựa trên tác phẩm có bản quyền.

## 6. Chấm điểm và thuật toán

Đặt trong `src/scoring/`, thuần TypeScript, không phụ thuộc database.

- **Quy đổi điểm**: do `CertificateSpec.score` của từng chứng chỉ đảm nhiệm. TOEIC: bảng tra số câu đúng (0–100) sang điểm 5–495 cho mỗi kỹ năng, dựa trên bảng ước lượng công khai; tổng là cộng hai phần.
- **Điểm yếu**: với mỗi skillTag, tỷ lệ đúng = số câu đúng / số câu đã làm trong 30 ngày. Chỉ xét tag có ít nhất 5 câu. Sắp xếp tăng dần.
- **SM-2**: chất lượng trả lời q (0–5): quên = 1, khó = 3, dễ = 5, trắc nghiệm đúng = 4, sai = 1. Cập nhật easeFactor, interval, repetitions theo công thức SM-2 chuẩn; interval đầu 1 ngày, lần hai 6 ngày.
- **Chọn câu drill**: trọng số ưu tiên: chưa làm (3), làm sai gần nhất (2), làm đúng (1); rút ngẫu nhiên theo trọng số.
- **Sinh đáp án nhiễu trắc nghiệm từ vựng**: lấy cùng `pos`, loại trừ từ có `meaningVi` trùng, ưu tiên từ trong `UserWord` của người dùng, thiếu thì lấy ngẫu nhiên từ `Word`.

## 7. Xử lý lỗi

- LLM trả sai định dạng hoặc lỗi mạng: thử lại một lần; vẫn lỗi thì `GenerationJob.status = FAILED`, ghi `error`, không lưu nội dung. Admin có nút chạy lại.
- Hết hạn mức miễn phí (HTTP 429): job dừng, báo rõ "hết hạn mức, thử lại sau" và thời gian gợi ý.
- LibreTranslate không phản hồi (timeout 5 giây): popup hiện nghĩa từ điển nếu có, không thì thông báo "chưa dịch được".
- TTS lỗi: câu hỏi vẫn ở `DRAFT`, hiện cảnh báo thiếu audio; không cho đăng câu Listening thiếu audio.
- Mất mạng khi thi: câu trả lời giữ trong localStorage theo `attemptId`; khi có mạng, gửi lại toàn bộ. Server nhận theo nguyên tắc ghi đè theo `order`.
- Thời gian thi: server ghi `startedAt`, khi nộp kiểm tra không vượt quá thời gian cho phép cộng 2 phút dung sai; vượt thì vẫn chấm nhưng đánh dấu `overtime`.

## 8. Kiểm thử

- **Unit** (Vitest): quy đổi điểm, SM-2, thống kê điểm yếu, chọn câu drill, sinh đáp án nhiễu, tách câu, chuẩn hóa từ khi tra từ điển, phát hiện chiều dịch.
- **API/integration**: tạo attempt, nộp bài, tính điểm; lưu từ; cache dịch; nhập file có lỗi theo dòng. Dùng database test riêng.
- **Giao diện** (Playwright, mức cơ bản): bôi đen hiện popup và lưu từ; trang đọc hai cột tô sáng câu tương ứng; luồng drill 5 câu.
- Provider ngoài được mock trong test; có một test tích hợp tùy chọn chạy thật khi có key.

## 9. Thứ tự xây dựng

1. Khung dự án: Next.js, Prisma, Postgres, Auth.js, layout, vai trò admin.
2. Từ điển nội bộ: script nhập StarDict, bảng `Word`, popup dịch với tra từ và LibreTranslate, cache.
3. Ngân hàng câu hỏi: `CertificateSpec` cho TOEIC, schema, nhập từ file, drill, thi thử, chấm điểm, trang kết quả.
4. Dashboard và bản đồ điểm yếu.
5. Từ vựng: lưu từ, ôn thẻ SM-2, trắc nghiệm hai chiều.
6. Đọc song ngữ: schema, nhập từ file, trang đọc hai cột và mobile.
7. Quản trị: tạo nội dung bằng AI, TTS, tạo đề tự động, quản lý bài đọc.
8. Dữ liệu ban đầu: ít nhất 1 đề đầy đủ, 300 câu drill, 20 bài đọc, và từ điển.

Mỗi bước có test kèm theo và chạy được độc lập trước khi sang bước tiếp.
