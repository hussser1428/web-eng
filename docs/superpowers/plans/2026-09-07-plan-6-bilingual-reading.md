# Kế hoạch 6: Đọc song ngữ

> Trạng thái: ĐÃ HOÀN THÀNH 2026-09-08 trên nhánh plan-6-reading.

> **Dành cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để làm theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để đánh dấu.

**Mục tiêu:** Người học đọc được bài song ngữ Anh–Việt: danh sách bài lọc theo thể loại và độ khó, trang đọc hai cột trên desktop và gộp đoạn trên di động, bôi đen từ trong cột tiếng Anh để tra và lưu từ kèm câu chứa từ. Admin nhập bài từ file JSON bằng script dòng lệnh (quản lý bài đọc trên web thuộc kế hoạch 7).

**Kiến trúc:** Hai bảng mới `Reading` + `ReadingSentence` (một migration). Module `src/features/reading/` nhận `db` qua tham số. Định dạng file nhập là **đoạn → câu** (`paragraphs: [[{en, vi}, ...], ...]`), server tự tính `order`, `paragraphIndex`, `wordCount`; định dạng này sẽ được kế hoạch 7 tái dùng làm đầu ra của LLM giống cách `questionFileSchema` được tái dùng cho sinh câu hỏi. Trang đọc **không có JS cuộn đồng bộ**: mỗi đoạn là một hàng lưới hai cột (`md:grid-cols-2`), nên hai cột luôn thẳng hàng theo đoạn; dưới `md` hai ô xếp chồng (Anh trên, Việt dưới) đúng yêu cầu di động. Tô sáng câu cùng `order` ở cột kia bằng một state `hoverOrder` trong component client.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Prisma 6 / PostgreSQL, Zod, Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 3 "Bài đọc song ngữ", mục 4.5, mục 4.6 phần lưu từ kèm `sourceContext`, mục 9 bước 6).

**Có một migration:** bảng `Reading`, `ReadingSentence` (Task 1).

## Quyết định đã chốt

Các mục đánh dấu *(giả định)* do agent lập kế hoạch chọn; người dùng đã duyệt tổng thể ("làm nốt các kế hoạch") nên thực thi theo đúng như ghi, không hỏi lại.

1. **Định dạng file nhập theo đoạn** (`paragraphs: Array<Array<{ en, vi }>>`) thay vì mảng phẳng có `order`/`paragraphIndex`. Người viết file và LLM không phải đánh số; server tính. *(giả định)*
2. **Bài đọc có `source: QuestionSource`** (`IMPORT` | `AI` | `MANUAL`), tái dùng enum sẵn có để admin lọc "bài do AI viết" ở kế hoạch 7. Không tạo enum mới. *(giả định)*
3. **Danh sách và trang đọc công khai**, không cần đăng nhập (giống popup dịch). Lưu từ vẫn cần đăng nhập — popup đã xử lý. Chỉ hiện bài `PUBLISHED`; bài `DRAFT` trả `notFound()`.
4. **Không cuộn đồng bộ bằng JS.** Lưới hai cột theo đoạn đã đủ thẳng hàng. *(giả định)*
5. **Câu chứa từ làm `sourceContext`:** thêm thuộc tính `data-translate-context` vào `selection-utils.ts::blockContext()` — phần tử gần nhất có thuộc tính này thắng quy tắc thẻ khối. Mỗi câu tiếng Anh render là `<span data-translate-context>`. Sửa một chỗ, mọi trang khác không đổi hành vi.
6. **Không phân trang danh sách bài** (tối đa 100 bài mới nhất). Kế hoạch 8 chỉ có 20 bài. *(giả định)*
7. **Không làm trong kế hoạch này:** trang admin bài đọc (danh sách, đăng/gỡ, sửa câu, nhập qua web, sinh bằng AI) — tất cả thuộc kế hoạch 7. Không thêm bài đọc vào dashboard.

## Ràng buộc chung

Mọi task đều phải tuân thủ; phần **Yêu cầu** của từng task ngầm bao gồm mục này.

- **Toàn bộ tiếng Việt:** giao diện, thông báo lỗi, tên test, comment, commit message.
- **Phân lớp:** hàm trong `src/features/*` **luôn nhận `db` qua tham số**, gõ kiểu hẹp bằng `Pick<PrismaClient, ...>`. Chỉ `src/app/**` và `prisma/seed/**` mới import `@/lib/prisma`.
- **Test nghiệp vụ dùng fake `db`**, không mock module. Test component dùng Testing Library (jsdom mặc định).
- **Bảng màu hiện hành:** `bg-background`, `.card`, `text-muted`, `border-line`, `bg-surface-2`, `.text-accent` / `.btn-primary`, `text-danger`, `text-info`, `text-accent-text`. Không `neon`, không `.glow`.
- **Không dùng emoji trong giao diện.** Icon từ `lucide-react`, `size={18}`/`size={20}`/`size={26}` cho tiêu đề trang, `aria-hidden="true"`.
- **Không thêm dependency mới.**
- **Trang đọc KHÔNG đặt `data-no-translate`** — popup dịch phải hoạt động ở đó.
- Mỗi task kết thúc bằng: `npm test`, `npm run typecheck`, `npm run lint` sạch (được phép còn đúng 1 warning `<img>` đã biết ở `QuestionCard.tsx`), rồi commit.

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `prisma/schema.prisma` | **Sửa:** enum `ReadingGenre`, `ReadingLevel`; model `Reading`, `ReadingSentence`. |
| `src/features/reading/labels.ts` | Nhãn tiếng Việt cho thể loại và độ khó, dùng chung cho bộ lọc, thẻ bài, admin sau này. |
| `src/features/reading/import-schema.ts` | `readingFileSchema` (Zod) định dạng file nhập theo đoạn. |
| `src/features/reading/import-reading.ts` | `importReading()`: ghi `Reading` + `createMany` câu, tính `wordCount`. |
| `src/features/reading/list-readings.ts` | `listReadings()`: bài đã đăng, lọc thể loại/độ khó. |
| `src/features/reading/get-reading.ts` | `getReading()`: một bài đã đăng kèm câu gộp theo đoạn; `groupParagraphs()` thuần. |
| `prisma/seed/import-reading.ts` | Script `npm run db:import-reading -- <file.json> [--draft]`. |
| `prisma/seed/fixtures/reading-sample.json` | Bài mẫu ngắn (ngụ ngôn Aesop, public domain) để thử. |
| `src/components/translate-popup/selection-utils.ts` | **Sửa:** `blockContext()` ưu tiên `[data-translate-context]`. |
| `src/components/reading/ReadingFilters.tsx` | Form GET lọc thể loại/độ khó. |
| `src/components/reading/ReadingCard.tsx` | Thẻ một bài trong danh sách. |
| `src/components/reading/ReadingView.tsx` | Client: lưới hai cột theo đoạn, tô sáng câu cùng `order`, nút ẩn/hiện tiếng Việt trên di động. |
| `src/app/reading/page.tsx` | Danh sách bài. Thay `ComingSoon`. |
| `src/app/reading/[id]/page.tsx` | Trang đọc. |
| `README.md`, `CLAUDE.md` | Tài liệu. |

---

### Task 1: Schema, nhãn và định dạng file nhập

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/features/reading/labels.ts`, `src/features/reading/import-schema.ts`
- Test: `src/features/reading/import-schema.test.ts`

**Schema (thêm vào cuối `schema.prisma`):**
```prisma
enum ReadingGenre {
  HUMOR
  FAIRY_TALE
  ANIME
  NEWS
}

enum ReadingLevel {
  A2
  B1
  B2
  C1
}

model Reading {
  id         String            @id @default(cuid())
  title      String
  genre      ReadingGenre
  level      ReadingLevel
  sourceName String
  sourceUrl  String?
  license    String
  status     ContentStatus     @default(DRAFT)
  source     QuestionSource    @default(IMPORT)
  wordCount  Int
  createdAt  DateTime          @default(now())
  sentences  ReadingSentence[]

  @@index([status, genre, level])
}

model ReadingSentence {
  id             String  @id @default(cuid())
  readingId      String
  order          Int
  paragraphIndex Int
  en             String
  vi             String
  reading        Reading @relation(fields: [readingId], references: [id], onDelete: Cascade)

  @@unique([readingId, order])
}
```

**Interfaces:**
- `labels.ts`:
  ```ts
  import type { ReadingGenre, ReadingLevel } from "@prisma/client";
  export const GENRE_LABELS: Record<ReadingGenre, string> = { HUMOR: "Truyện hài", FAIRY_TALE: "Cổ tích", ANIME: "Anime", NEWS: "Tin tức" };
  export const LEVEL_LABELS: Record<ReadingLevel, string> = { A2: "A2 – Sơ cấp", B1: "B1 – Trung cấp", B2: "B2 – Trên trung cấp", C1: "C1 – Nâng cao" };
  export const GENRES = Object.keys(GENRE_LABELS) as ReadingGenre[];
  export const LEVELS = Object.keys(LEVEL_LABELS) as ReadingLevel[];
  ```
- `import-schema.ts`:
  ```ts
  import { z } from "zod";
  const sentence = z.object({ en: z.string().trim().min(1).max(1000), vi: z.string().trim().min(1).max(1000) });
  export const readingFileSchema = z.object({
    title: z.string().trim().min(1).max(200),
    genre: z.enum(["HUMOR", "FAIRY_TALE", "ANIME", "NEWS"]),
    level: z.enum(["A2", "B1", "B2", "C1"]),
    sourceName: z.string().trim().min(1).max(200),
    sourceUrl: z.string().url().optional(),
    license: z.string().trim().min(1).max(300),
    paragraphs: z.array(z.array(sentence).min(1)).min(1).max(200),
  });
  export type ReadingFile = z.infer<typeof readingFileSchema>;
  ```

**Test cần có (`import-schema.test.ts`):**
- `it("nhận file hợp lệ")` với 2 đoạn.
- `it("từ chối đoạn rỗng")` — `paragraphs: [[]]`.
- `it("từ chối thể loại lạ")` — `genre: "POEM"`.
- `it("từ chối câu thiếu tiếng Việt")`.

**Bước:**
- [x] Viết test trước, chạy `npm test -- src/features/reading/import-schema.test.ts` thấy đỏ (module chưa có).
- [x] Tạo `labels.ts`, `import-schema.ts`; test xanh.
- [x] Thêm schema Prisma; chạy `npm run db:migrate -- --name reading` (Postgres Docker phải đang chạy; nếu Docker chưa lên thì `npm run db:up` rồi chờ). Kiểm tra thư mục `prisma/migrations/*_reading` xuất hiện và `npx prisma generate` xong (typecheck cần enum mới).
- [x] `npm test`, `npm run typecheck`, `npm run lint`.
- [x] Commit: `feat: bảng bài đọc song ngữ và định dạng file nhập`.

---

### Task 2: Nhập bài đọc

**Files:**
- Create: `src/features/reading/import-reading.ts`, `prisma/seed/import-reading.ts`, `prisma/seed/fixtures/reading-sample.json`
- Modify: `package.json` (script `db:import-reading`)
- Test: `src/features/reading/import-reading.test.ts`

**Interfaces:**
- ```ts
  export type ImportReadingDb = Pick<PrismaClient, "reading" | "readingSentence">;
  export async function importReading(
    db: ImportReadingDb,
    data: ReadingFile,
    opts: { publish: boolean; source?: QuestionSource },
  ): Promise<{ readingId: string; sentences: number }>;
  ```
  - `wordCount` = tổng số token `en.split(/\s+/)` không rỗng trên mọi câu.
  - `order` chạy từ 1 liên tục qua mọi đoạn; `paragraphIndex` từ 0.
  - Ghi `Reading` bằng `db.reading.create`, câu bằng `db.readingSentence.createMany`. `source` mặc định `"IMPORT"`, `status` theo `publish`.
- Script: đối số `<file.json>`, cờ `--draft` (mặc định đăng ngay, giống `import-questions.ts`). In `Đã nhập bài "<title>" (<n> câu, <status>).`

**Fixture `reading-sample.json`:** ngụ ngôn "The Fox and the Grapes" (Aesop, public domain), `genre: "FAIRY_TALE"`, `level: "A2"`, `sourceName: "Aesop's Fables"`, `sourceUrl: "https://www.gutenberg.org/ebooks/11339"`, `license: "Public domain"`, 2 đoạn, 6–8 câu, tiếng Việt do người viết plan dịch. Ví dụ đoạn 1:
```json
[
  { "en": "One hot summer day a fox was walking through an orchard.", "vi": "Một ngày hè nóng nực, con cáo đi dạo qua vườn cây ăn quả." },
  { "en": "He saw a bunch of ripe grapes hanging from a high branch.", "vi": "Nó thấy một chùm nho chín treo trên cành cao." },
  { "en": "\"Just the thing to quench my thirst,\" he said.", "vi": "\"Đúng là thứ để giải khát,\" nó nói." }
]
```

**Test cần có (fake `db` ghi nhớ tham số `create`/`createMany`):**
- `it("đánh số order liên tục qua các đoạn và paragraphIndex theo đoạn")` — 2 đoạn (2 câu, 1 câu) ⇒ order 1,2,3; paragraphIndex 0,0,1.
- `it("tính wordCount từ tiếng Anh")`.
- `it("mặc định source IMPORT, status theo publish")`.
- `it("ghi source AI khi được truyền")`.

**Bước:**
- [x] Test đỏ → hàm → test xanh.
- [x] Script + `package.json`: `"db:import-reading": "tsx prisma/seed/import-reading.ts"`.
- [x] Fixture; chạy thật `npm run db:import-reading -- prisma/seed/fixtures/reading-sample.json` để có một bài trong DB (cần Postgres). Ghi id in ra để dùng thử ở Task 4.
- [x] `npm test`, `npm run typecheck`, `npm run lint`; commit: `feat: nhập bài đọc song ngữ từ file JSON`.

---

### Task 3: Đọc dữ liệu cho hai trang

**Files:**
- Create: `src/features/reading/list-readings.ts`, `src/features/reading/get-reading.ts`
- Test: cạnh từng file.

**Interfaces:**
- ```ts
  export type ReadingListItem = { id: string; title: string; genre: ReadingGenre; level: ReadingLevel; wordCount: number; createdAt: Date };
  export function listReadings(
    db: Pick<PrismaClient, "reading">,
    filter: { genre?: ReadingGenre; level?: ReadingLevel } = {},
  ): Promise<ReadingListItem[]>;
  ```
  `where: { status: "PUBLISHED", ...(genre && { genre }), ...(level && { level }) }`, `orderBy: { createdAt: "desc" }`, `take: 100`, `select` đúng các trường trên.
- ```ts
  export type SentenceForClient = { order: number; en: string; vi: string };
  export type ReadingForClient = {
    id: string; title: string; genre: ReadingGenre; level: ReadingLevel;
    sourceName: string; sourceUrl: string | null; license: string; wordCount: number;
    paragraphs: SentenceForClient[][];
  };
  /** Thuần: gộp câu (đã sắp theo order) thành mảng đoạn theo paragraphIndex. */
  export function groupParagraphs(rows: Array<{ order: number; paragraphIndex: number; en: string; vi: string }>): SentenceForClient[][];
  export async function getReading(db: Pick<PrismaClient, "reading">, id: string): Promise<ReadingForClient | null>;
  ```
  `getReading` dùng `findFirst({ where: { id, status: "PUBLISHED" }, include: { sentences: { orderBy: { order: "asc" } } } })`; trả `null` khi không có hoặc chưa đăng.

**Test cần có:**
- `listReadings`: `it("chỉ lấy bài đã đăng")`, `it("lọc theo thể loại và độ khó khi có")`, `it("không đưa genre undefined vào where")`.
- `groupParagraphs`: `it("gộp theo paragraphIndex và giữ thứ tự order")`, `it("đoạn bị bỏ số vẫn không tạo mảng rỗng")` (paragraphIndex 0 rồi 2 ⇒ 2 mảng, không có mảng rỗng ở giữa).
- `getReading`: `it("trả null khi bài ở DRAFT")` (fake trả null vì where có status).

**Bước:**
- [x] Test đỏ → hàm → xanh; commit: `feat: truy vấn danh sách và nội dung bài đọc`.

---

### Task 4: Ngữ cảnh câu cho popup dịch

**Files:**
- Modify: `src/components/translate-popup/selection-utils.ts`
- Test: `src/components/translate-popup/selection-utils.test.ts` (đã có thì thêm case, chưa có thì tạo)

**Thay đổi:** trong `blockContext()`, trước vòng lặp tìm thẻ khối:
```ts
const marked = el?.closest("[data-translate-context]");
if (marked) return marked.textContent?.replace(/\s+/g, " ").trim().slice(0, 300) || null;
```

**Test cần có:** `it("ưu tiên phần tử có data-translate-context thay vì thẻ khối")` — `<p><span data-translate-context>Câu một.</span> <span>Câu hai.</span></p>`, node trong span đầu ⇒ `"Câu một."`; `it("vẫn lấy thẻ khối khi không có thuộc tính")`.

**Bước:**
- [x] Test đỏ → sửa → xanh; commit: `feat: popup dịch lấy ngữ cảnh theo câu khi có data-translate-context`.

---

### Task 5: Trang danh sách bài đọc

**Files:**
- Create: `src/components/reading/ReadingFilters.tsx`, `src/components/reading/ReadingCard.tsx`
- Modify: `src/app/reading/page.tsx`
- Test: `ReadingFilters.test.tsx`, `ReadingCard.test.tsx`

**Interfaces:**
- `ReadingFilters({ genre, level }: { genre?: string; level?: string })` — server component được, `<form method="GET">` với hai `<select name="genre">`, `<select name="level">` (tuỳ chọn "Tất cả" giá trị rỗng), nút "Lọc", link "Bỏ lọc" tới `/reading` khi đang lọc. Dùng `GENRES`/`LEVELS` + nhãn từ `labels.ts`. Class `inputClass`, `labelClass` từ `@/components/layout/AuthCard`.
- `ReadingCard({ item }: { item: ReadingListItem })` — `<Link href={/reading/${id}}>` bọc `.card`, tiêu đề, dòng phụ `"{GENRE_LABELS[genre]} · {level} · {wordCount} từ · ~{Math.max(1, Math.round(wordCount / 150))} phút"`.
- Trang `/reading`: `searchParams` (Promise) → kiểm tra `genre`/`level` có trong `GENRES`/`LEVELS` mới truyền vào `listReadings(prisma, ...)`; tiêu đề `BookOpen size={26}` "Đọc song ngữ", mô tả "Đọc tiếng Anh với bản dịch cạnh bên. Bôi đen từ để tra và lưu vào sổ từ vựng."; rỗng thì `<p className="card p-6 text-muted">Chưa có bài nào{đang lọc ? " khớp bộ lọc" : " được đăng"}.</p>`; có thì lưới `sm:grid-cols-2 lg:grid-cols-3` như `/exam`.

**Test cần có:**
- `ReadingFilters`: giữ giá trị đã chọn (`toHaveValue`), có link "Bỏ lọc" khi đang lọc, không có khi không lọc.
- `ReadingCard`: hiện nhãn thể loại tiếng Việt và số phút đọc ≥ 1.

**Bước:**
- [x] Component + test.
- [x] Trang; xoá import `ComingSoon` khỏi file này (component vẫn còn dùng nơi khác? kiểm tra bằng grep; nếu không còn ai dùng thì **vẫn giữ** file, kế hoạch sau có thể cần).
- [x] `npm test`, `npm run typecheck`, `npm run lint`; commit: `feat: danh sách bài đọc song ngữ có lọc thể loại và độ khó`.

---

### Task 6: Trang đọc hai cột

**Files:**
- Create: `src/components/reading/ReadingView.tsx`, `src/app/reading/[id]/page.tsx`
- Test: `ReadingView.test.tsx`

**Interfaces:**
- `ReadingView({ reading }: { reading: ReadingForClient })` — client component.
  - State: `hoverOrder: number | null`, `showVi: boolean` (mặc định `true`).
  - Thanh công cụ trên cùng: nút `md:hidden` "Ẩn tiếng Việt" / "Hiện tiếng Việt" (`aria-pressed`), icon `Eye`/`EyeOff` size 18.
  - Mỗi đoạn: `<div className="grid gap-3 md:grid-cols-2 md:gap-8">`; ô Anh `<p lang="en">` chứa các `<span data-translate-context data-order={order}>` cách nhau một khoảng trắng; ô Việt `<p lang="vi" className={showVi ? "" : "hidden md:block"}>` chứa các `<span data-order={order}>`.
  - Sự kiện `onMouseEnter`/`onMouseLeave`/`onTouchStart` trên từng span đặt `hoverOrder`; span có `order === hoverOrder` (ở cả hai cột) thêm class `bg-accent/20 rounded` và `data-highlight="true"`.
  - Cuối bài: `<footer className="text-sm text-muted">Nguồn: {sourceName}{sourceUrl && <a href target="_blank" rel="noreferrer">…</a>} · Giấy phép: {license}</footer>`.
  - Cột Việt đặt `data-no-translate` để bôi đen tiếng Việt không bật popup (spec: popup hoạt động trong cột tiếng Anh).
- Trang `[id]`: `params` (Promise) → `getReading(prisma, id)` → `notFound()` khi null; `generateMetadata` trả `{ title: reading.title }`; tiêu đề h1, dòng phụ thể loại/độ khó/số từ, link "← Danh sách" về `/reading`; rồi `<ReadingView reading={reading} />`. Bọc trong `max-w-5xl`.

**Test cần có (`ReadingView.test.tsx`):**
- `it("rê chuột vào câu tiếng Anh thì câu tiếng Việt cùng thứ tự được tô sáng")` — `fireEvent.mouseEnter` span Anh order 2 ⇒ đúng 2 phần tử có `data-highlight="true"`.
- `it("nút ẩn tiếng Việt thêm class hidden cho cột Việt")`.
- `it("câu tiếng Anh có data-translate-context để popup lấy đúng câu")`.
- `it("hiện nguồn và giấy phép")`.

**Bước:**
- [x] Test đỏ → component → xanh.
- [x] Trang `[id]`; mở thử `http://localhost:3000/reading/<id bài mẫu>` bằng `npm run dev` nếu Postgres đang chạy, chụp màn hình Edge headless (`--headless=new --screenshot`) ở 1280px và 390px để kiểm tra hai cột và xếp chồng.
- [x] `npm test`, `npm run typecheck`, `npm run lint`; commit: `feat: trang đọc song ngữ hai cột, tô sáng câu và ẩn tiếng Việt trên di động`.

---

### Task 7: Tài liệu

**Files:**
- Modify: `README.md`, `CLAUDE.md`, file kế hoạch này (đánh dấu hoàn thành).

**Bước:**
- [x] README: mục "Đọc song ngữ" (lệnh `npm run db:import-reading -- <file.json> [--draft]`, định dạng file theo đoạn, file mẫu), thêm lệnh vào mục "Lệnh".
- [x] CLAUDE.md: thêm lệnh vào khối lệnh; thêm đoạn "Đọc song ngữ": file nhập theo đoạn, server tính `order`/`paragraphIndex`/`wordCount` trong `import-reading.ts`; trang đọc là lưới theo đoạn, không có JS cuộn đồng bộ; `data-translate-context` cho ngữ cảnh câu; cột Việt `data-no-translate`.
- [x] Đổi dòng đầu file kế hoạch này thành `> Trạng thái: ĐÃ HOÀN THÀNH <ngày>`.
- [x] Commit: `docs: hướng dẫn đọc song ngữ và nhập bài`.

---

## Việc hoãn lại (kế hoạch 7 nhặt)

- Trang admin bài đọc: danh sách/lọc, đăng/gỡ, sửa từng câu, nhập JSON qua web, sinh bằng AI (LLM viết tiếng Anh theo đoạn rồi dịch, trả đúng `readingFileSchema` → `importReading(source: "AI")`).
- Thẻ "Bài đọc mới" trên dashboard.
