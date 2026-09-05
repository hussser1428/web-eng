# TOEIC Prep

Web luyện thi TOEIC Listening & Reading, kèm từ điển bôi đen dịch, từ vựng ôn tập ngắt quãng, bài đọc song ngữ.

## Chạy lần đầu

1. `cp .env.example .env` và điền `AUTH_SECRET` (`openssl rand -base64 32`). Khi deploy lên VPS phải đặt `AUTH_TRUST_HOST="true"` (không cần khi chạy local hoặc trên Vercel).
2. `docker compose up -d` (Postgres và LibreTranslate; LibreTranslate tải model en/vi lần đầu vài phút).
3. `npm install`
4. `npx prisma migrate dev`
5. Tải từ điển theo `prisma/seed/fixtures/README.md`, rồi `npm run db:import-dict -- data/star_anhviet`
6. `npm run dev` và mở http://localhost:3000

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

## Tài liệu

- Thiết kế: `docs/superpowers/specs/`
- Kế hoạch triển khai: `docs/superpowers/plans/`
