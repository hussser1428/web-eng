# TOEIC Prep

Web luyện thi TOEIC Listening & Reading, kèm từ điển bôi đen dịch, từ vựng ôn tập ngắt quãng, bài đọc song ngữ.

## Chạy lần đầu

1. `cp .env.example .env` và điền `AUTH_SECRET` (`openssl rand -base64 32`). Khi deploy lên VPS phải đặt `AUTH_TRUST_HOST="true"` (không cần khi chạy local hoặc trên Vercel).
   - Sinh câu hỏi bằng AI cần `LLM_API_KEY` (mặc định gọi Groq qua `LLM_BASE_URL`/`LLM_MODEL`, đổi được sang endpoint OpenAI-compatible khác). Bỏ trống thì trang sinh câu hỏi báo chưa cấu hình, phần còn lại vẫn chạy.
2. `docker compose up -d` (Postgres và LibreTranslate; LibreTranslate tải model en/vi lần đầu vài phút).
3. `npm install`
4. `npx prisma migrate dev`
5. Tải từ điển theo `prisma/seed/fixtures/README.md`, rồi `npm run db:import-dict -- data/star_anhviet`
6. `npm run dev` và mở http://localhost:3000
7. Luyện tập: `/drill` → Part 5 → 10 câu
8. Thi thử: `/exam` → Đề rút gọn 1 → làm → Nộp bài → xem điểm
9. Từ vựng: bôi đen một từ tiếng Anh bất kỳ → **Lưu từ** trong popup → `/vocab`
10. Ôn từ: `/vocab` → **Ôn thẻ** (lật thẻ, tự đánh giá) hoặc **Trắc nghiệm** (4 lựa chọn, hai chiều)
11. Đọc song ngữ: `npm run db:import-reading -- prisma/seed/fixtures/reading-sample.json` rồi mở `/reading`

## Nhập câu hỏi và đề thi

Câu hỏi nằm trong file JSON (xem mẫu `prisma/seed/fixtures/questions-sample.json`, định dạng mô tả trong `src/features/questions/import-schema.ts`).

```bash
npm run db:import-questions -- prisma/seed/fixtures/questions-sample.json --exam "Đề rút gọn 1"
# --draft: nhập ở trạng thái DRAFT (chưa hiện cho người dùng)
# không có --exam: chỉ nhập câu cho luyện tập
```

Đề đầy đủ TOEIC cần 200 câu theo cấu trúc trong `src/features/certificates/toeic.ts`; đề ít câu hơn vẫn chạy được và được ghi "đề rút gọn".

## Ôn từ ngắt quãng

Mỗi từ lưu trong sổ tay có lịch ôn riêng theo thuật toán SM-2: trả lời đúng thì khoảng cách giữa hai lần ôn giãn dần (1 ngày → 6 ngày → nhân theo `easeFactor`), trả lời sai thì quay về 1 ngày. Mỗi phiên tối đa 20 thẻ, ưu tiên từ quá hạn lâu nhất.

Hết từ đến hạn vẫn ôn được — gọi là **ôn sớm**. Ôn sớm không đẩy lịch ra xa thêm: trả lời đúng thì giữ nguyên hạn cũ, trả lời sai vẫn kéo từ về ôn lại ngày mai.

Trắc nghiệm cần từ điển đủ dày: mỗi câu phải tìm được ba từ khác cùng loại từ và khác nghĩa. Sổ tay quá ít từ hoặc chưa nhập từ điển StarDict thì trang trắc nghiệm sẽ mời chuyển sang ôn thẻ.

## Đọc song ngữ

Nhập bài đọc từ file JSON theo định dạng **đoạn → câu** (mỗi đoạn là mảng câu, mỗi câu có `en` và `vi`). Server tự tính `order` (số thứ tự liên tục), `paragraphIndex` (vị trí đoạn), và `wordCount`:

```bash
npm run db:import-reading -- <file.json> [--draft]
# --draft: nhập ở trạng thái DRAFT (chưa hiện cho người dùng)
# mặc định: nhập ở trạng thái PUBLISHED (công khai ngay)
```

Định dạng file (xem mẫu `prisma/seed/fixtures/reading-sample.json`):
```json
{
  "title": "The Fox and the Grapes",
  "genre": "FAIRY_TALE",
  "level": "A2",
  "sourceName": "Aesop's Fables",
  "sourceUrl": "https://...",
  "license": "Public domain",
  "paragraphs": [
    [
      { "en": "One hot day a fox saw grapes.", "vi": "Một ngày nóng, con cáo thấy nho." },
      { "en": "He tried to reach them.", "vi": "Nó cố gắng để lấy chúng." }
    ],
    [...]
  ]
}
```

Trang đọc (`/reading`) là danh sách bài lọc theo thể loại (HUMOR, FAIRY_TALE, ANIME, NEWS) và độ khó (A2, B1, B2, C1), hiển thị bài đã đăng. Mỗi bài là lưới hai cột trên desktop (Anh trái, Việt phải), xếp chồng trên di động (Anh trên, Việt dưới). Nút trên di động ẩn/hiện cột tiếng Việt. Bôi đen từ trong cột tiếng Anh để tra từ — popup dịch lấy câu chứa từ làm ngữ cảnh (lưu vào sổ từ vựng kèm `sourceContext` là câu).

## Quản trị

Cấp quyền admin bằng script dòng lệnh (không có giao diện tự phong admin):

```bash
npm run db:make-admin -- email@example.com
```

Role được sao vào JWT lúc đăng nhập, nên nếu đang có phiên thì phải **đăng xuất rồi đăng nhập lại** mới thấy `/admin`. Sau đó vào `/admin`:

- `/admin` — tổng quan số câu đã đăng/nháp/cần theo từng Part.
- `/admin/questions` — lọc (kể cả lọc "Thiếu audio"), sửa, đăng/gỡ hàng loạt (không đăng được câu Listening thiếu audio); tích câu rồi bấm nút "Tạo audio" để tổng hợp audio từ transcript.
- `/admin/import` — dán hoặc chọn file JSON, mặc định vào nháp, có thể tạo đề luôn.
- `/admin/exams` — ghép đề tự động từ câu đã đăng (đủ số câu mỗi Part mới tạo), đăng/gỡ đề.
- `/admin/generate` — sinh câu hỏi Part 2–7 bằng LLM, tối đa 10 câu mỗi lô, kết quả vào nháp chờ duyệt; có lịch sử job và nút chạy lại. Part 2–4 chỉ sinh transcript (tạo audio là bước riêng ở `/admin/questions`); Part 1 cần ảnh nên chỉ nhập được qua file JSON.
- `/admin/readings` — danh sách bài đọc, lọc theo trạng thái/thể loại/nguồn, đăng/gỡ, xoá.
- `/admin/readings/[id]` — sửa từng câu của một bài (lưu là ghi đè toàn bộ câu của bài).
- `/admin/readings/import` — dán hoặc chọn file JSON bài đọc, mặc định vào nháp.
- `/admin/readings/generate` — sinh bài đọc song ngữ bằng LLM (Anh và Việt cùng lúc, theo cặp câu), tối đa 10 câu mỗi lô, vào nháp chờ duyệt; có lịch sử job và nút chạy lại.

Sinh nội dung bằng AI cần các biến môi trường `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (xem `.env.example`, mặc định gọi Groq). Thiếu `LLM_API_KEY` thì trang `/admin/generate` và `/admin/readings/generate` báo "Chưa cấu hình LLM", các trang quản trị khác vẫn dùng bình thường.

### Audio và TTS

Audio Listening (Part 1–4) tổng hợp bằng Edge TTS (gói `msedge-tts`, dùng giọng đọc miễn phí của Microsoft Edge — không cần khoá hay biến môi trường). Ở `/admin/questions`, admin sửa transcript nếu cần rồi tích câu và bấm "Tạo audio" (tối đa 10 mục mỗi lần bấm); câu thuộc nhóm (Part 3/4) chỉ tổng hợp một file audio dùng chung cho cả nhóm. File audio lưu trong Postgres (bảng `AudioFile`) và phục vụ qua `GET /api/audio/<id>`.

Quy ước transcript (mỗi dòng một lượt nói):

| Part | Cú pháp dòng | Giọng đọc |
| --- | --- | --- |
| 1 | `A:` đến `D:` | một giọng, đọc thành "A. …" |
| 2 | `Q:` rồi `A:`/`B:`/`C:` | `Q:` một giọng; `A:`/`B:`/`C:` giọng khác, đọc thành "A. …" |
| 3 | mỗi dòng `M:`/`Man:` hoặc `W:`/`Woman:` | nam/nữ xen kẽ theo tiền tố |
| 4 | không tiền tố | một giọng dẫn |

## Docker

`docker compose up -d db` chỉ Postgres; `docker compose up -d libretranslate` chỉ LibreTranslate.

## Lệnh

- `npm test` – unit test (Vitest)
- `npm run build` – build production
- `npm run db:studio` – xem database
- `npm run db:import-reading -- <file.json> [--draft]` – nhập bài đọc song ngữ

## Trước khi công khai

- Giới hạn tần suất (rate limit) cho `/api/translate` — API không cần đăng nhập, có thể bị lạm dụng để nghẽn LibreTranslate.
- Giới hạn kích thước bảng `TranslationCache` (TTL hoặc dọn định kỳ) — mỗi lần dịch hụt cache ghi thêm một dòng.
- Ghim phiên bản image LibreTranslate trong `docker-compose.yml` thay vì dùng `latest`.
- Cấu hình Google OAuth thật (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) trước khi bật đăng nhập bằng Google.

## Việc còn nợ (đã biết, chưa chặn)

- **Khi có tải thật:** `saveExamAnswers` gọi `updateMany` cho từng câu (200 lượt truy vấn mỗi 30 giây với một đề đầy đủ). Nên chỉ gửi những câu vừa đổi và gộp các lệnh cập nhật khi chấm bài (`src/features/attempts/save-exam-answers.ts`, `submit.ts`).
- **Audio lưu trong Postgres** (bảng `AudioFile`): khi vượt vài trăm MB nên chuyển `saveAudio` sang lưu trữ ngoài (S3) — chỉ cần đổi hàm đó và route `/api/audio/[id]`.
- **Edge TTS (`msedge-tts`) là API không chính thức của Microsoft Edge:** Microsoft đổi giao thức thì TTS lỗi `TTS_UNAVAILABLE` hàng loạt — cần nâng cấp gói.
- Ghép audio nhiều lượt nói bằng cách nối thẳng các đoạn MP3, chưa chèn khoảng lặng giữa các lượt nói.
- `importQuestions()` và `buildExam()` chưa bọc trong transaction — nhập/ghép đề nửa chừng lỗi có thể để lại dữ liệu dở dang.
- Chưa có cách thu hồi quyền admin; role nằm trong JWT nên mọi thay đổi role chỉ có hiệu lực sau khi người dùng đăng nhập lại.
- Nhà cung cấp LLM chưa thử lại khi gặp HTTP 503 (Gemini quá tải tạm thời); admin phải bấm "Chạy lại". Với key Gemini, dùng model `gemini-3.6-flash` (dòng 2.5 đã ngừng cho key mới).
- Action sinh câu hỏi (`/admin/generate`) chưa có rate limit — admin bấm liên tục có thể tốn hạn mức LLM miễn phí nhanh hơn cần thiết.
- Sinh nội dung chạy đồng bộ trong một request (`maxDuration = 60`). Bài đọc dài (~500 từ) có thể vượt trần: job bị cắt giữa chừng nằm mãi ở trạng thái `RUNNING` và bảng lịch sử không cho "Chạy lại" (chỉ job `FAILED` mới có nút). Cần đánh dấu job quá hạn thành `FAILED` hoặc chuyển sang chạy nền.

## Tài liệu

- Thiết kế: `docs/superpowers/specs/`
- Kế hoạch triển khai: `docs/superpowers/plans/`
