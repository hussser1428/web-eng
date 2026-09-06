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

## Docker

`docker compose up -d db` chỉ Postgres; `docker compose up -d libretranslate` chỉ LibreTranslate.

## Lệnh

- `npm test` – unit test (Vitest)
- `npm run build` – build production
- `npm run db:studio` – xem database

## Trước khi công khai

- Giới hạn tần suất (rate limit) cho `/api/translate` — API không cần đăng nhập, có thể bị lạm dụng để nghẽn LibreTranslate.
- Giới hạn kích thước bảng `TranslationCache` (TTL hoặc dọn định kỳ) — mỗi lần dịch hụt cache ghi thêm một dòng.
- Ghim phiên bản image LibreTranslate trong `docker-compose.yml` thay vì dùng `latest`.
- Cấu hình Google OAuth thật (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) trước khi bật đăng nhập bằng Google.

## Việc còn nợ (đã biết, chưa chặn)

- **Trước khi nhập nội dung phần nghe (Part 1–4):** `QuestionCard` truyền `key` theo từng câu nên `AudioOnce` bị reset mỗi câu — audio dùng chung cho cả nhóm (Part 3/4) sẽ phát lại ở từng câu trong nhóm. Cần tách audio của nhóm ra khỏi vòng đời từng câu (`src/components/questions/QuestionCard.tsx`, `src/components/exam/ExamRunner.tsx`).
- **Khi có tải thật:** `saveExamAnswers` gọi `updateMany` cho từng câu (200 lượt truy vấn mỗi 30 giây với một đề đầy đủ). Nên chỉ gửi những câu vừa đổi và gộp các lệnh cập nhật khi chấm bài (`src/features/attempts/save-exam-answers.ts`, `submit.ts`).

## Tài liệu

- Thiết kế: `docs/superpowers/specs/`
- Kế hoạch triển khai: `docs/superpowers/plans/`
