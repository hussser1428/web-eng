# Kế hoạch 4: Từ vựng và ôn ngắt quãng SM-2

> **Dành cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để làm theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để đánh dấu.

**Mục tiêu:** Từ đã lưu trong popup dịch có chỗ để xem lại, tìm, xoá, và ôn lại theo lịch ngắt quãng SM-2 bằng hai chế độ: lật thẻ tự đánh giá và trắc nghiệm bốn lựa chọn hai chiều Anh–Việt / Việt–Anh.

**Kiến trúc:** Module nghiệp vụ `src/features/vocab/` mở rộng từ `save-word.ts` sẵn có. Trung tâm là hàm thuần `reviewSm2` (không chạm database, không biết ngày giờ) — mọi thứ khác chỉ là lớp ghép: `pick-due` chọn thẻ, `review-word` ghép SM-2 vào bảng `UserWord`, `start-session` dựng sẵn cả phiên ôn. Ba trang `/vocab`, `/vocab/flashcard`, `/vocab/quiz` là server component nạp dữ liệu rồi trao cho component client, đúng khuôn `/drill` hiện có.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Prisma 6 / PostgreSQL, Zod, Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 4.4 màn hình từ vựng, mục 6 công thức SM-2 và sinh đáp án nhiễu).

**Không cần migration.** Bảng `UserWord` đã có đủ `easeFactor`, `intervalDays`, `repetitions`, `dueAt` và index `[userId, dueAt]`.

## Quyết định đã chốt với người dùng

Ghi lại để người thực thi không tự ý làm khác:

1. **Hai chế độ ôn riêng biệt**, không trộn: nút "Ôn thẻ" và nút "Trắc nghiệm". Cả hai cùng cập nhật SM-2.
2. **Mỗi phiên tối đa 20 thẻ**, ưu tiên `dueAt` sớm nhất.
3. **Hết từ đến hạn thì cho ôn sớm:** báo "hôm nay không còn từ nào đến hạn", vẫn cho ôn các từ sắp đến hạn. Ôn sớm **không đẩy lịch ra xa thêm** — xem quy tắc trong Task 3.
4. **Cố tình không dựng bảng `VocabQuizAnswer`** (spec mục 3 có nhắc). SM-2 cập nhật thẳng trên `UserWord`; bảng đó chỉ phục vụ thống kê mà hiện chưa màn hình nào đọc. Đây là YAGNI có chủ ý, **không phải bỏ sót** — thêm sau vẫn dễ.
5. **Trả nốt món nợ của Kế hoạch 3:** thẻ "Số từ đến hạn ôn" trên dashboard (Task 12).

## Ràng buộc chung

Mọi task đều phải tuân thủ các điều dưới đây; phần **Yêu cầu** của từng task ngầm bao gồm mục này.

- **Toàn bộ tiếng Việt:** giao diện, thông báo lỗi, tên test (`it("quên thì đặt lại về 1 ngày")`), comment, commit message.
- **Phân lớp:** hàm trong `src/features/*` **luôn nhận `db` qua tham số**, gõ kiểu hẹp bằng `Pick<PrismaClient, ...>`, **không** import `prisma` singleton. Chỉ `src/app/**` mới được import `@/lib/prisma`.
- **Không rò đáp án xuống client.** Giống `questions/dto.ts`, DTO của phiên trắc nghiệm không chứa chỉ số đáp án đúng. Cách làm: mỗi lựa chọn mang theo `id` của từ nguồn, đáp án đúng là lựa chọn có `id === wordId`; server tự đối chiếu khi chấm.
- **Test nghiệp vụ dùng fake `db`** (object thường có `vi.fn()`), không mock module, không cần Postgres. Test component dùng jsdom mặc định. Test route handler thêm `// @vitest-environment node` ở dòng đầu và `vi.mock` các module `@/lib/*`.
- **Ngẫu nhiên phải tiêm được:** mọi hàm dùng ngẫu nhiên nhận tham số `rand?: () => number` mặc định `Math.random`, để test khoá được kết quả.
- **Thời gian phải tiêm được:** mọi hàm dùng ngày giờ nhận `now?: Date` mặc định `new Date()`.
- **File test nằm cạnh file nguồn**, đuôi `.test.ts` / `.test.tsx`.
- **Bảng màu hiện hành:** nền `bg-background`, thẻ dùng class `.card`, chữ phụ `text-muted`, viền `border-line`, nền phụ `bg-surface-2`, điểm nhấn `.text-accent` / `.btn-primary` / màu `accent`, lỗi `text-danger`, link phụ `text-info`. **Không** dùng `neon`, gradient chữ, hay class `.glow` — chúng đã bị xoá.
- **Không dùng emoji trong giao diện.** Cần icon thì import từ `lucide-react`, cỡ `size={18}` hoặc `size={20}`, kèm `aria-hidden="true"`.
- **Không thêm dependency mới.**
- Node 22, npm. Alias `@/*` → `src/*`.
- Mỗi task kết thúc bằng: `npm test`, `npm run typecheck`, `npm run lint` đều sạch (được phép còn đúng 1 warning `<img>` đã biết ở `QuestionCard.tsx`, 0 error), rồi commit.

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `src/features/vocab/sm2.ts` | Hàm thuần SM-2: trạng thái cũ + chất lượng trả lời → trạng thái mới. Không chạm database, không biết ngày giờ. |
| `src/features/vocab/pick-due.ts` | Chọn tối đa 20 từ đến hạn; hết thì trả các từ sắp đến hạn kèm cờ `early`. |
| `src/features/vocab/review-word.ts` | Ghép: đọc `UserWord` → `reviewSm2` → hẹn `dueAt` mới (có quy tắc ôn sớm) → ghi lại. |
| `src/features/vocab/list-words.ts` | Danh sách từ đã lưu: tìm theo từ hoặc nghĩa, phân trang. |
| `src/features/vocab/remove-word.ts` | Xoá một `UserWord` của đúng người dùng. |
| `src/features/vocab/count-due.ts` | Đếm số từ đến hạn và tổng số từ đã lưu. Dùng cho trang `/vocab` lẫn dashboard. |
| `src/features/vocab/pick-distractors.ts` | Ba đáp án nhiễu: cùng loại từ, khác nghĩa, ưu tiên từ người dùng đã lưu. |
| `src/features/vocab/start-session.ts` | Dựng sẵn cả phiên ôn (thẻ hoặc trắc nghiệm) trong một lần gọi. |
| `src/features/vocab/answer-quiz.ts` | Chấm một câu trắc nghiệm rồi cập nhật SM-2. |
| `src/lib/speak.ts` | Phát âm bằng Web Speech API, tách từ `PopupContent.tsx` để hai nơi dùng chung. |
| `src/app/api/vocab/review/route.ts` | POST chấm một thẻ (quên / khó / dễ). |
| `src/app/api/vocab/quiz/route.ts` | POST chấm một câu trắc nghiệm. |
| `src/app/api/vocab/saved/[wordId]/route.ts` | DELETE xoá một từ đã lưu. |
| `src/components/vocab/due-label.ts` | Hàm thuần: `dueAt` + `now` → nhãn "Đến hạn" / "Còn 3 ngày". |
| `src/components/vocab/VocabList.tsx` | Ô tìm, danh sách từ, nút xoá, phân trang. |
| `src/components/vocab/FlashcardSession.tsx` | Phiên lật thẻ, ba nút tự đánh giá. |
| `src/components/vocab/QuizSession.tsx` | Phiên trắc nghiệm bốn lựa chọn, hai chiều. |
| `src/app/vocab/page.tsx` | Server: danh sách + số từ đến hạn + hai nút mở phiên ôn. Thay `ComingSoon`. |
| `src/app/vocab/flashcard/page.tsx` | Server: dựng phiên thẻ rồi trao cho `FlashcardSession`. |
| `src/app/vocab/quiz/page.tsx` | Server: dựng phiên trắc nghiệm rồi trao cho `QuizSession`. |
| `src/components/dashboard/DueWordsCard.tsx` | Thẻ "Số từ đến hạn ôn" trên dashboard. |

---

### Task 1: Hàm thuần SM-2

**Files:**
- Create: `src/features/vocab/sm2.ts`
- Test: `src/features/vocab/sm2.test.ts`

**Interfaces:**
- Consumes: không có (task đầu tiên, thuần TypeScript).
- Produces:
  - `type Sm2State = { easeFactor: number; intervalDays: number; repetitions: number }`
  - `const QUALITY: { FORGOT: 1; HARD: 3; EASY: 5; QUIZ_CORRECT: 4; QUIZ_WRONG: 1 }`
  - `const MIN_EASE_FACTOR = 1.3`
  - `function reviewSm2(state: Sm2State, quality: number): Sm2State`
  - `function addDays(from: Date, days: number): Date`

**Yêu cầu:** Đúng công thức SM-2 chuẩn như spec mục 6: `easeFactor` mới `= EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))`, không bao giờ xuống dưới 1.3. Chất lượng dưới 3 thì đặt lại `repetitions = 0` và `intervalDays = 1`. Từ 3 trở lên thì `repetitions` tăng 1, khoảng cách lần một là 1 ngày, lần hai là 6 ngày, từ lần ba trở đi là `round(intervalDays cũ * easeFactor mới)`.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/sm2.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reviewSm2, addDays, QUALITY, MIN_EASE_FACTOR } from "./sm2";

const MOI = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

describe("reviewSm2", () => {
  it("lần đầu trả lời dễ thì hẹn lại sau 1 ngày và easeFactor tăng", () => {
    const r = reviewSm2(MOI, QUALITY.EASY);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeCloseTo(2.6, 5);
  });

  it("lần hai thì hẹn 6 ngày", () => {
    const r = reviewSm2({ easeFactor: 2.6, intervalDays: 1, repetitions: 1 }, QUALITY.EASY);
    expect(r.repetitions).toBe(2);
    expect(r.intervalDays).toBe(6);
  });

  it("từ lần ba trở đi khoảng cách nhân theo easeFactor và làm tròn", () => {
    const r = reviewSm2({ easeFactor: 2.6, intervalDays: 6, repetitions: 2 }, QUALITY.EASY);
    expect(r.easeFactor).toBeCloseTo(2.7, 5);
    expect(r.intervalDays).toBe(16); // round(6 * 2.7) = 16
  });

  it("trắc nghiệm đúng (q=4) giữ nguyên easeFactor", () => {
    const r = reviewSm2({ easeFactor: 2.5, intervalDays: 6, repetitions: 2 }, QUALITY.QUIZ_CORRECT);
    expect(r.easeFactor).toBeCloseTo(2.5, 5);
    expect(r.intervalDays).toBe(15);
  });

  it("quên thì đặt lại về 1 ngày và repetitions 0", () => {
    const r = reviewSm2({ easeFactor: 2.5, intervalDays: 30, repetitions: 5 }, QUALITY.FORGOT);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeLessThan(2.5);
  });

  it("khó (q=3) vẫn tính là nhớ nhưng easeFactor giảm", () => {
    const r = reviewSm2({ easeFactor: 2.5, intervalDays: 6, repetitions: 2 }, QUALITY.HARD);
    expect(r.repetitions).toBe(3);
    expect(r.easeFactor).toBeCloseTo(2.36, 5);
  });

  it("easeFactor không bao giờ xuống dưới 1.3 dù quên nhiều lần", () => {
    let s = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
    for (let i = 0; i < 20; i++) s = reviewSm2(s, QUALITY.FORGOT);
    expect(s.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it("chất lượng ngoài khoảng 0–5 bị kẹp lại, không sinh easeFactor kỳ dị", () => {
    expect(reviewSm2(MOI, 99).easeFactor).toBeCloseTo(2.6, 5);
    expect(reviewSm2(MOI, -5).intervalDays).toBe(1);
  });
});

describe("addDays", () => {
  it("cộng đúng số ngày, không đụng vào mốc gốc", () => {
    const goc = new Date("2026-09-05T10:00:00.000Z");
    expect(addDays(goc, 3).toISOString()).toBe("2026-09-08T10:00:00.000Z");
    expect(goc.toISOString()).toBe("2026-09-05T10:00:00.000Z");
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/sm2.test.ts`
Mong đợi: FAIL, báo không tìm thấy module `./sm2`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/sm2.ts`:

```ts
/** Trạng thái ôn ngắt quãng của một từ; tên trường khớp các cột của bảng UserWord. */
export type Sm2State = { easeFactor: number; intervalDays: number; repetitions: number };

/** Chất lượng trả lời quy đổi theo spec mục 6. */
export const QUALITY = {
  FORGOT: 1,
  HARD: 3,
  EASY: 5,
  QUIZ_CORRECT: 4,
  QUIZ_WRONG: 1,
} as const;

/** SM-2 không cho easeFactor xuống thấp hơn mức này, nếu không khoảng cách sẽ co lại vô hạn. */
export const MIN_EASE_FACTOR = 1.3;

const MS_MOT_NGAY = 24 * 60 * 60 * 1000;

/**
 * Một lượt ôn theo SM-2. Hàm thuần: không chạm database, không đọc đồng hồ.
 * Việc quy ra mốc `dueAt` do `review-word.ts` làm, vì chỉ chỗ đó mới biết "bây giờ" là lúc nào.
 */
export function reviewSm2(state: Sm2State, quality: number): Sm2State {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const easeFactor = Math.max(MIN_EASE_FACTOR, state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  // Quên: học lại từ đầu, nhưng easeFactor đã giảm nên lần sau lên chậm hơn.
  if (q < 3) return { easeFactor, intervalDays: 1, repetitions: 0 };

  const repetitions = state.repetitions + 1;
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.intervalDays * easeFactor);
  return { easeFactor, intervalDays, repetitions };
}

/** Cộng số ngày vào một mốc thời gian, trả về Date mới. */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_MOT_NGAY);
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/sm2.test.ts`
Mong đợi: PASS, 9 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/sm2.ts src/features/vocab/sm2.test.ts
git commit -m "feat: hàm thuần SM-2 cho ôn từ ngắt quãng"
```

---

### Task 2: Chọn từ đến hạn cho một phiên ôn

**Files:**
- Create: `src/features/vocab/pick-due.ts`
- Test: `src/features/vocab/pick-due.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `type PickDueDb = Pick<PrismaClient, "userWord">`
  - `const SESSION_SIZE = 20`
  - `type DueWord = { wordId: string; headword: string; phonetic: string | null; pos: string | null; meaningVi: string; exampleEn: string | null; exampleVi: string | null; sourceContext: string | null }`
  - `function pickDueWords(db: PickDueDb, p: { userId: string; now?: Date; limit?: number }): Promise<{ early: boolean; words: DueWord[] }>`

**Yêu cầu:** Lấy tối đa `SESSION_SIZE` từ có `dueAt <= now`, sắp `dueAt` tăng dần (quá hạn lâu nhất lên trước). Không còn từ nào đến hạn thì truy vấn lần hai không lọc `dueAt`, lấy các từ sắp đến hạn nhất, và trả `early: true` để giao diện báo "bạn đang ôn sớm". Người chưa lưu từ nào thì trả mảng rỗng với `early: true`.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/pick-due.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { pickDueWords, SESSION_SIZE } from "./pick-due";

const NOW = new Date("2026-09-05T00:00:00.000Z");

function row(wordId: string, headword: string) {
  return {
    wordId,
    sourceContext: null,
    word: { headword, phonetic: null, pos: "n", meaningVi: `nghĩa ${headword}`, exampleEn: null, exampleVi: null },
  };
}

describe("pickDueWords", () => {
  it("lấy từ đã đến hạn, sớm nhất trước, tối đa 20 thẻ", async () => {
    const findMany = vi.fn(async () => [row("w1", "apple"), row("w2", "book")]);
    const db = { userWord: { findMany } };

    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });

    expect(r.early).toBe(false);
    expect(r.words.map((w) => w.headword)).toEqual(["apple", "book"]);
    expect(r.words[0].wordId).toBe("w1");
    expect(r.words[0].meaningVi).toBe("nghĩa apple");
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0] as { where: unknown; orderBy: unknown; take: number };
    expect(args.where).toMatchObject({ userId: "u1", dueAt: { lte: NOW } });
    expect(args.orderBy).toEqual({ dueAt: "asc" });
    expect(args.take).toBe(SESSION_SIZE);
  });

  it("không còn từ đến hạn thì trả các từ sắp đến hạn kèm cờ ôn sớm", async () => {
    const findMany = vi.fn(async () => []);
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row("w9", "zebra")] as never);
    const db = { userWord: { findMany } };

    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });

    expect(r.early).toBe(true);
    expect(r.words.map((w) => w.headword)).toEqual(["zebra"]);
    expect(findMany).toHaveBeenCalledTimes(2);
    const args = findMany.mock.calls[1][0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ userId: "u1" });
  });

  it("chưa lưu từ nào thì danh sách rỗng", async () => {
    const db = { userWord: { findMany: vi.fn(async () => []) } };
    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });
    expect(r.words).toEqual([]);
    expect(r.early).toBe(true);
  });

  it("tôn trọng limit truyền vào", async () => {
    const findMany = vi.fn(async () => [row("w1", "apple")]);
    const db = { userWord: { findMany } };
    await pickDueWords(db as never, { userId: "u1", now: NOW, limit: 5 });
    expect((findMany.mock.calls[0][0] as { take: number }).take).toBe(5);
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/pick-due.test.ts`
Mong đợi: FAIL, không tìm thấy module `./pick-due`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/pick-due.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export type PickDueDb = Pick<PrismaClient, "userWord">;

/** Số thẻ tối đa của một phiên ôn — đủ ngắn để không nản. */
export const SESSION_SIZE = 20;

export type DueWord = {
  wordId: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  exampleEn: string | null;
  exampleVi: string | null;
  sourceContext: string | null;
};

const SELECT = {
  wordId: true,
  sourceContext: true,
  word: { select: { headword: true, phonetic: true, pos: true, meaningVi: true, exampleEn: true, exampleVi: true } },
} as const;

type Row = {
  wordId: string;
  sourceContext: string | null;
  word: { headword: string; phonetic: string | null; pos: string | null; meaningVi: string; exampleEn: string | null; exampleVi: string | null };
};

function toDueWord(r: Row): DueWord {
  return { wordId: r.wordId, sourceContext: r.sourceContext, ...r.word };
}

/**
 * Chọn thẻ cho một phiên ôn.
 * Hết từ đến hạn thì vẫn trả về các từ sắp đến hạn kèm `early: true`; người dùng
 * được ôn sớm, và `review-word.ts` lo phần không để lịch bị đẩy ra xa thêm.
 */
export async function pickDueWords(
  db: PickDueDb,
  p: { userId: string; now?: Date; limit?: number },
): Promise<{ early: boolean; words: DueWord[] }> {
  const now = p.now ?? new Date();
  const take = p.limit ?? SESSION_SIZE;

  const due: Row[] = await db.userWord.findMany({
    where: { userId: p.userId, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take,
    select: SELECT,
  });
  if (due.length > 0) return { early: false, words: due.map(toDueWord) };

  const soon: Row[] = await db.userWord.findMany({
    where: { userId: p.userId },
    orderBy: { dueAt: "asc" },
    take,
    select: SELECT,
  });
  return { early: true, words: soon.map(toDueWord) };
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/pick-due.test.ts`
Mong đợi: PASS, 4 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/pick-due.ts src/features/vocab/pick-due.test.ts
git commit -m "feat: chọn từ đến hạn cho phiên ôn, hết hạn thì cho ôn sớm"
```

---

### Task 3: Chấm một thẻ và hẹn lại lịch

**Files:**
- Create: `src/features/vocab/review-word.ts`
- Test: `src/features/vocab/review-word.test.ts`

**Interfaces:**
- Consumes: `reviewSm2`, `addDays`, `QUALITY` từ `./sm2` (Task 1).
- Produces:
  - `type ReviewDb = Pick<PrismaClient, "userWord">`
  - `type ReviewResult = { intervalDays: number; dueAt: Date; early: boolean }`
  - `function reviewWord(db: ReviewDb, p: { userId: string; wordId: string; quality: number; now?: Date }): Promise<ReviewResult>`

**Yêu cầu:** Đọc `UserWord` theo khoá `userId_wordId`; không có thì ném `Error("NOT_FOUND")`. Chạy `reviewSm2`, quy `intervalDays` mới ra mốc `dueAt = now + intervalDays`.

**Quy tắc ôn sớm** (quyết định số 3 ở đầu kế hoạch): nếu `dueAt` cũ vẫn ở tương lai thì người dùng đang ôn sớm — lấy mốc **sớm hơn** giữa lịch cũ và lịch vừa tính. Nhờ vậy trả lời đúng khi ôn sớm không đẩy lịch ra xa thêm, còn trả lời sai vẫn kéo được từ về ôn lại ngày mai. Khi từ đã thật sự đến hạn (`dueAt` cũ nằm trong quá khứ) thì dùng thẳng lịch mới.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/review-word.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { reviewWord } from "./review-word";
import { QUALITY } from "./sm2";

const NOW = new Date("2026-09-05T00:00:00.000Z");
const NGAY = 24 * 60 * 60 * 1000;

function fakeDb(row: Record<string, unknown> | null) {
  return {
    userWord: {
      findUnique: vi.fn(async () => row),
      update: vi.fn(async () => ({})),
    },
  };
}

describe("reviewWord", () => {
  it("từ đến hạn, trả lời dễ thì hẹn lại sau 1 ngày và ghi lại tiến độ", async () => {
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: new Date(NOW.getTime() - NGAY) });

    const r = await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.EASY, now: NOW });

    expect(r.early).toBe(false);
    expect(r.intervalDays).toBe(1);
    expect(r.dueAt.toISOString()).toBe(new Date(NOW.getTime() + NGAY).toISOString());
    const args = db.userWord.update.mock.calls[0][0] as { where: { id: string }; data: Record<string, unknown> };
    expect(args.where.id).toBe("uw1");
    expect(args.data).toMatchObject({ intervalDays: 1, repetitions: 1 });
    expect(args.data.dueAt).toEqual(r.dueAt);
  });

  it("ôn sớm mà trả lời đúng thì lịch không bị đẩy xa hơn lịch cũ", async () => {
    const cu = new Date(NOW.getTime() + 30 * NGAY);
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 20, repetitions: 3, dueAt: cu });

    const r = await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.EASY, now: NOW });

    // SM-2 tính ra hơn 50 ngày, nhưng ôn sớm nên giữ nguyên mốc cũ 30 ngày
    expect(r.intervalDays).toBeGreaterThan(30);
    expect(r.early).toBe(true);
    expect(r.dueAt.toISOString()).toBe(cu.toISOString());
  });

  it("ôn sớm mà quên thì vẫn kéo từ về ôn lại ngày mai", async () => {
    const cu = new Date(NOW.getTime() + 30 * NGAY);
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 20, repetitions: 3, dueAt: cu });

    const r = await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.FORGOT, now: NOW });

    expect(r.dueAt.toISOString()).toBe(new Date(NOW.getTime() + NGAY).toISOString());
  });

  it("người dùng chưa lưu từ này thì ném NOT_FOUND và không ghi gì", async () => {
    const db = fakeDb(null);
    await expect(reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.EASY, now: NOW })).rejects.toThrow("NOT_FOUND");
    expect(db.userWord.update).not.toHaveBeenCalled();
  });

  it("tìm đúng bản ghi theo cặp người dùng và từ", async () => {
    const db = fakeDb({ id: "uw1", easeFactor: 2.5, intervalDays: 0, repetitions: 0, dueAt: NOW });
    await reviewWord(db as never, { userId: "u1", wordId: "w1", quality: QUALITY.HARD, now: NOW });
    const args = db.userWord.findUnique.mock.calls[0][0] as { where: { userId_wordId: { userId: string; wordId: string } } };
    expect(args.where.userId_wordId).toEqual({ userId: "u1", wordId: "w1" });
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/review-word.test.ts`
Mong đợi: FAIL, không tìm thấy module `./review-word`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/review-word.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { reviewSm2, addDays } from "./sm2";

export type ReviewDb = Pick<PrismaClient, "userWord">;

export type ReviewResult = { intervalDays: number; dueAt: Date; early: boolean };

/**
 * Chấm một thẻ rồi hẹn lại lịch ôn.
 *
 * Ôn sớm (mốc `dueAt` cũ còn ở tương lai) thì lấy mốc sớm hơn giữa lịch cũ và
 * lịch vừa tính: trả lời đúng không đẩy lịch đi xa thêm, còn trả lời sai vẫn
 * kéo được từ về ngày mai.
 */
export async function reviewWord(
  db: ReviewDb,
  p: { userId: string; wordId: string; quality: number; now?: Date },
): Promise<ReviewResult> {
  const now = p.now ?? new Date();
  const row = await db.userWord.findUnique({
    where: { userId_wordId: { userId: p.userId, wordId: p.wordId } },
    select: { id: true, easeFactor: true, intervalDays: true, repetitions: true, dueAt: true },
  });
  if (!row) throw new Error("NOT_FOUND");

  const next = reviewSm2(
    { easeFactor: row.easeFactor, intervalDays: row.intervalDays, repetitions: row.repetitions },
    p.quality,
  );
  const tinhDuoc = addDays(now, next.intervalDays);
  const early = row.dueAt.getTime() > now.getTime();
  const dueAt = early && row.dueAt.getTime() < tinhDuoc.getTime() ? row.dueAt : tinhDuoc;

  await db.userWord.update({ where: { id: row.id }, data: { ...next, dueAt } });
  return { intervalDays: next.intervalDays, dueAt, early };
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/review-word.test.ts`
Mong đợi: PASS, 5 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/review-word.ts src/features/vocab/review-word.test.ts
git commit -m "feat: chấm thẻ theo SM-2, ôn sớm không đẩy lịch xa thêm"
```

---

### Task 4: Danh sách, xoá và đếm từ đã lưu

**Files:**
- Create: `src/features/vocab/list-words.ts`
- Create: `src/features/vocab/remove-word.ts`
- Create: `src/features/vocab/count-due.ts`
- Test: `src/features/vocab/list-words.test.ts`
- Test: `src/features/vocab/remove-word.test.ts`
- Test: `src/features/vocab/count-due.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `const PAGE_SIZE = 20`
  - `type SavedWord = { wordId: string; headword: string; phonetic: string | null; pos: string | null; meaningVi: string; sourceContext: string | null; dueAt: Date; createdAt: Date }`
  - `type WordPage = { items: SavedWord[]; total: number; page: number; pageSize: number }`
  - `function listUserWords(db: Pick<PrismaClient, "userWord">, p: { userId: string; q?: string; page?: number; pageSize?: number }): Promise<WordPage>`
  - `function removeUserWord(db: Pick<PrismaClient, "userWord">, p: { userId: string; wordId: string }): Promise<{ removed: boolean }>`
  - `function countDueWords(db: Pick<PrismaClient, "userWord">, p: { userId: string; now?: Date }): Promise<{ due: number; saved: number }>`

**Yêu cầu:** Tìm kiếm khớp cả `headword` lẫn `meaningVi`, không phân biệt hoa thường (`mode: "insensitive"`). Chuỗi tìm rỗng hoặc chỉ khoảng trắng thì coi như không lọc. Trang bắt đầu từ 1; trang nhỏ hơn 1 bị kẹp về 1. Xoá dùng `deleteMany` kèm `userId` để không ai xoá được từ của người khác, và trả `removed: false` khi không có dòng nào bị xoá.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/list-words.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { listUserWords, PAGE_SIZE } from "./list-words";

function fakeDb(rows: unknown[], total: number) {
  return {
    userWord: {
      findMany: vi.fn(async () => rows),
      count: vi.fn(async () => total),
    },
  };
}

const ROW = {
  wordId: "w1",
  sourceContext: "I ate an apple.",
  dueAt: new Date("2026-09-06T00:00:00.000Z"),
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  word: { headword: "apple", phonetic: "/ˈæp.əl/", pos: "n", meaningVi: "quả táo" },
};

describe("listUserWords", () => {
  it("trả về từ đã lưu kèm tổng số, mới lưu lên trước", async () => {
    const db = fakeDb([ROW], 1);
    const r = await listUserWords(db as never, { userId: "u1" });

    expect(r.total).toBe(1);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(PAGE_SIZE);
    expect(r.items[0]).toMatchObject({ wordId: "w1", headword: "apple", meaningVi: "quả táo", pos: "n" });
    const args = db.userWord.findMany.mock.calls[0][0] as { where: Record<string, unknown>; orderBy: unknown; skip: number; take: number };
    expect(args.where).toEqual({ userId: "u1" });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(PAGE_SIZE);
  });

  it("tìm kiếm khớp cả từ lẫn nghĩa, không phân biệt hoa thường", async () => {
    const db = fakeDb([ROW], 1);
    await listUserWords(db as never, { userId: "u1", q: "táo" });

    const args = db.userWord.findMany.mock.calls[0][0] as { where: { word: { OR: unknown[] } } };
    expect(args.where.word.OR).toEqual([
      { headword: { contains: "táo", mode: "insensitive" } },
      { meaningVi: { contains: "táo", mode: "insensitive" } },
    ]);
    // Đếm phải lọc y hệt, nếu không số trang sẽ sai
    const countArgs = db.userWord.count.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where).toEqual(args.where);
  });

  it("chuỗi tìm chỉ có khoảng trắng thì coi như không lọc", async () => {
    const db = fakeDb([], 0);
    await listUserWords(db as never, { userId: "u1", q: "   " });
    const args = db.userWord.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ userId: "u1" });
  });

  it("trang 2 bỏ qua đúng số dòng của trang 1", async () => {
    const db = fakeDb([], 40);
    const r = await listUserWords(db as never, { userId: "u1", page: 2 });
    expect((db.userWord.findMany.mock.calls[0][0] as { skip: number }).skip).toBe(PAGE_SIZE);
    expect(r.page).toBe(2);
  });

  it("trang nhỏ hơn 1 bị kẹp về trang 1", async () => {
    const db = fakeDb([], 0);
    const r = await listUserWords(db as never, { userId: "u1", page: 0 });
    expect(r.page).toBe(1);
    expect((db.userWord.findMany.mock.calls[0][0] as { skip: number }).skip).toBe(0);
  });
});
```

Tạo `src/features/vocab/remove-word.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { removeUserWord } from "./remove-word";

describe("removeUserWord", () => {
  it("xoá đúng từ của đúng người dùng", async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const r = await removeUserWord({ userWord: { deleteMany } } as never, { userId: "u1", wordId: "w1" });

    expect(r).toEqual({ removed: true });
    const args = deleteMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ userId: "u1", wordId: "w1" });
  });

  it("không có dòng nào khớp thì removed false", async () => {
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    const r = await removeUserWord({ userWord: { deleteMany } } as never, { userId: "u1", wordId: "khong-co" });
    expect(r).toEqual({ removed: false });
  });
});
```

Tạo `src/features/vocab/count-due.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { countDueWords } from "./count-due";

const NOW = new Date("2026-09-05T00:00:00.000Z");

describe("countDueWords", () => {
  it("đếm riêng số từ đến hạn và tổng số từ đã lưu", async () => {
    const count = vi.fn(async () => 0);
    count.mockResolvedValueOnce(3).mockResolvedValueOnce(11);
    const r = await countDueWords({ userWord: { count } } as never, { userId: "u1", now: NOW });

    expect(r).toEqual({ due: 3, saved: 11 });
    expect((count.mock.calls[0][0] as { where: Record<string, unknown> }).where).toEqual({ userId: "u1", dueAt: { lte: NOW } });
    expect((count.mock.calls[1][0] as { where: Record<string, unknown> }).where).toEqual({ userId: "u1" });
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/list-words.test.ts src/features/vocab/remove-word.test.ts src/features/vocab/count-due.test.ts`
Mong đợi: FAIL, không tìm thấy ba module mới.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/list-words.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export type ListDb = Pick<PrismaClient, "userWord">;

/** Số từ hiện trên một trang danh sách. */
export const PAGE_SIZE = 20;

export type SavedWord = {
  wordId: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  sourceContext: string | null;
  dueAt: Date;
  createdAt: Date;
};

export type WordPage = { items: SavedWord[]; total: number; page: number; pageSize: number };

type Row = {
  wordId: string;
  sourceContext: string | null;
  dueAt: Date;
  createdAt: Date;
  word: { headword: string; phonetic: string | null; pos: string | null; meaningVi: string };
};

/** Danh sách từ đã lưu, mới nhất trước; `q` tìm đồng thời trong từ và trong nghĩa. */
export async function listUserWords(
  db: ListDb,
  p: { userId: string; q?: string; page?: number; pageSize?: number },
): Promise<WordPage> {
  const q = p.q?.trim() ?? "";
  const pageSize = p.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, Math.floor(p.page ?? 1));
  const where = {
    userId: p.userId,
    ...(q
      ? {
          word: {
            OR: [
              { headword: { contains: q, mode: "insensitive" as const } },
              { meaningVi: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.userWord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        wordId: true,
        sourceContext: true,
        dueAt: true,
        createdAt: true,
        word: { select: { headword: true, phonetic: true, pos: true, meaningVi: true } },
      },
    }) as Promise<Row[]>,
    db.userWord.count({ where }),
  ]);

  const items: SavedWord[] = rows.map((r) => ({
    wordId: r.wordId,
    sourceContext: r.sourceContext,
    dueAt: r.dueAt,
    createdAt: r.createdAt,
    ...r.word,
  }));
  return { items, total, page, pageSize };
}
```

Tạo `src/features/vocab/remove-word.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export type RemoveDb = Pick<PrismaClient, "userWord">;

/** Xoá một từ khỏi sổ tay. Dùng deleteMany kèm userId để không xoá nhầm từ của người khác. */
export async function removeUserWord(db: RemoveDb, p: { userId: string; wordId: string }): Promise<{ removed: boolean }> {
  const r = await db.userWord.deleteMany({ where: { userId: p.userId, wordId: p.wordId } });
  return { removed: r.count > 0 };
}
```

Tạo `src/features/vocab/count-due.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export type CountDb = Pick<PrismaClient, "userWord">;

/** Số từ đang đến hạn ôn và tổng số từ đã lưu. Dùng cho trang /vocab lẫn dashboard. */
export async function countDueWords(db: CountDb, p: { userId: string; now?: Date }): Promise<{ due: number; saved: number }> {
  const now = p.now ?? new Date();
  const [due, saved] = await Promise.all([
    db.userWord.count({ where: { userId: p.userId, dueAt: { lte: now } } }),
    db.userWord.count({ where: { userId: p.userId } }),
  ]);
  return { due, saved };
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/list-words.test.ts src/features/vocab/remove-word.test.ts src/features/vocab/count-due.test.ts`
Mong đợi: PASS, 8 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/list-words.ts src/features/vocab/list-words.test.ts src/features/vocab/remove-word.ts src/features/vocab/remove-word.test.ts src/features/vocab/count-due.ts src/features/vocab/count-due.test.ts
git commit -m "feat: danh sách, tìm, xoá và đếm từ đã lưu"
```

---

### Task 5: Sinh đáp án nhiễu cho trắc nghiệm

**Files:**
- Create: `src/features/vocab/pick-distractors.ts`
- Test: `src/features/vocab/pick-distractors.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `type DistractorDb = Pick<PrismaClient, "word">`
  - `const DISTRACTOR_COUNT = 3`
  - `type Distractor = { id: string; headword: string; meaningVi: string }`
  - `function pickDistractors(db: DistractorDb, p: { userId: string; word: { id: string; pos: string | null; meaningVi: string }; count?: number; rand?: () => number }): Promise<Distractor[]>`

**Yêu cầu (spec mục 6):** Đáp án nhiễu phải cùng `pos` với đáp án đúng, khác `id`, và **không trùng `meaningVi`** với đáp án đúng lẫn với nhiễu khác — nếu không câu hỏi sẽ có hai đáp án đều đúng. Ưu tiên từ người dùng cũng đã lưu (`userWords: { some: { userId } }`) vì nhiễu quen mắt thì khó hơn; thiếu thì lấy thêm từ bảng `Word` chung. Từ không có `pos` thì bỏ điều kiện `pos`. Không gom đủ số nhiễu thì ném `Error("NOT_ENOUGH_WORDS")`.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/pick-distractors.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { pickDistractors, DISTRACTOR_COUNT } from "./pick-distractors";

const DICH = { id: "w1", pos: "n", meaningVi: "quả táo" };

function w(id: string, headword: string, meaningVi: string) {
  return { id, headword, meaningVi };
}

/** rand giả luôn trả 0 nên luôn lấy phần tử đầu còn lại — kết quả khoá được. */
const randDau = () => 0;

describe("pickDistractors", () => {
  it("lấy đủ ba nhiễu từ những từ người dùng đã lưu, cùng loại từ", async () => {
    const findMany = vi.fn(async () => [w("w2", "book", "quyển sách"), w("w3", "car", "xe hơi"), w("w4", "dog", "con chó")]);
    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });

    expect(r).toHaveLength(DISTRACTOR_COUNT);
    expect(r.map((x) => x.headword)).toEqual(["book", "car", "dog"]);
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({ id: { not: "w1" }, pos: "n", userWords: { some: { userId: "u1" } } });
  });

  it("từ đã lưu không đủ thì lấy thêm từ bảng Word chung", async () => {
    const findMany = vi.fn(async () => []);
    findMany
      .mockResolvedValueOnce([w("w2", "book", "quyển sách")] as never)
      .mockResolvedValueOnce([w("w5", "egg", "quả trứng"), w("w6", "fish", "con cá")] as never);

    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });

    expect(r.map((x) => x.headword)).toEqual(["book", "egg", "fish"]);
    expect(findMany).toHaveBeenCalledTimes(2);
    const args = findMany.mock.calls[1][0] as { where: Record<string, unknown> };
    expect(args.where).not.toHaveProperty("userWords");
  });

  it("bỏ qua từ trùng nghĩa với đáp án đúng", async () => {
    const findMany = vi.fn(async () => [
      w("w2", "apple tree", "quả táo"),
      w("w3", "car", "xe hơi"),
      w("w4", "dog", "con chó"),
      w("w7", "egg", "quả trứng"),
    ]);
    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });
    expect(r.map((x) => x.meaningVi)).not.toContain("quả táo");
    expect(r).toHaveLength(3);
  });

  it("hai nhiễu không được trùng nghĩa nhau", async () => {
    const findMany = vi.fn(async () => [
      w("w2", "car", "xe hơi"),
      w("w3", "automobile", "xe hơi"),
      w("w4", "dog", "con chó"),
      w("w5", "cat", "con mèo"),
    ]);
    const r = await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau });
    expect(new Set(r.map((x) => x.meaningVi)).size).toBe(3);
  });

  it("từ không có loại từ thì không lọc theo pos", async () => {
    const findMany = vi.fn(async () => [w("w2", "book", "quyển sách"), w("w3", "car", "xe hơi"), w("w4", "dog", "con chó")]);
    await pickDistractors({ word: { findMany } } as never, { userId: "u1", word: { ...DICH, pos: null }, rand: randDau });
    const args = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).not.toHaveProperty("pos");
  });

  it("từ điển không đủ từ thì ném NOT_ENOUGH_WORDS", async () => {
    const findMany = vi.fn(async () => [w("w2", "book", "quyển sách")]);
    await expect(
      pickDistractors({ word: { findMany } } as never, { userId: "u1", word: DICH, rand: randDau }),
    ).rejects.toThrow("NOT_ENOUGH_WORDS");
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/pick-distractors.test.ts`
Mong đợi: FAIL, không tìm thấy module `./pick-distractors`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/pick-distractors.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export type DistractorDb = Pick<PrismaClient, "word">;

/** Số đáp án nhiễu mỗi câu — cộng đáp án đúng là bốn lựa chọn. */
export const DISTRACTOR_COUNT = 3;

/** Số từ lấy ra mỗi lần truy vấn để bốc ngẫu nhiên. */
const POOL_SIZE = 50;

export type Distractor = { id: string; headword: string; meaningVi: string };

/**
 * Bốc ngẫu nhiên từ `pool` cho tới khi đủ `n` từ, bỏ qua từ có nghĩa đã dùng.
 * `used` được chia sẻ giữa hai lượt truy vấn nên nhiễu không bao giờ trùng nghĩa nhau.
 */
function takeRandom(pool: Distractor[], n: number, rand: () => number, used: Set<string>): Distractor[] {
  const out: Distractor[] = [];
  const rest = [...pool];
  while (out.length < n && rest.length > 0) {
    const i = Math.min(rest.length - 1, Math.floor(rand() * rest.length));
    const [w] = rest.splice(i, 1);
    if (used.has(w.meaningVi)) continue;
    used.add(w.meaningVi);
    out.push(w);
  }
  return out;
}

/**
 * Ba đáp án nhiễu cho một câu trắc nghiệm từ vựng (spec mục 6):
 * cùng loại từ, khác nghĩa, ưu tiên từ chính người dùng đã lưu.
 */
export async function pickDistractors(
  db: DistractorDb,
  p: { userId: string; word: { id: string; pos: string | null; meaningVi: string }; count?: number; rand?: () => number },
): Promise<Distractor[]> {
  const count = p.count ?? DISTRACTOR_COUNT;
  const rand = p.rand ?? Math.random;
  const used = new Set([p.word.meaningVi]);
  const where = { id: { not: p.word.id }, ...(p.word.pos ? { pos: p.word.pos } : {}) };
  const select = { id: true, headword: true, meaningVi: true };

  const cuaToi: Distractor[] = await db.word.findMany({
    where: { ...where, userWords: { some: { userId: p.userId } } },
    take: POOL_SIZE,
    select,
  });
  const out = takeRandom(cuaToi, count, rand, used);

  if (out.length < count) {
    const chung: Distractor[] = await db.word.findMany({ where, take: POOL_SIZE, select });
    out.push(...takeRandom(chung, count - out.length, rand, used));
  }

  if (out.length < count) throw new Error("NOT_ENOUGH_WORDS");
  return out;
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/pick-distractors.test.ts`
Mong đợi: PASS, 6 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/pick-distractors.ts src/features/vocab/pick-distractors.test.ts
git commit -m "feat: sinh đáp án nhiễu cùng loại từ, khác nghĩa, ưu tiên từ đã lưu"
```

---

### Task 6: Dựng một phiên ôn

**Files:**
- Create: `src/features/vocab/start-session.ts`
- Test: `src/features/vocab/start-session.test.ts`

**Interfaces:**
- Consumes: `pickDueWords`, `DueWord`, `PickDueDb` từ `./pick-due` (Task 2); `pickDistractors`, `Distractor`, `DistractorDb` từ `./pick-distractors` (Task 5).
- Produces:
  - `type ReviewMode = "FLASHCARD" | "QUIZ"`
  - `type Direction = "EN_TO_VI" | "VI_TO_EN"`
  - `type QuizChoice = { id: string; text: string }`
  - `type QuizItem = { wordId: string; direction: Direction; prompt: string; phonetic: string | null; choices: QuizChoice[] }`
  - `type VocabSession = { mode: "FLASHCARD"; early: boolean; items: DueWord[] } | { mode: "QUIZ"; early: boolean; items: QuizItem[] }`
  - `type SessionDb = PickDueDb & DistractorDb`
  - `function startVocabSession(db: SessionDb, p: { userId: string; mode: ReviewMode; now?: Date; rand?: () => number }): Promise<VocabSession>`

**Yêu cầu:**

- Chế độ `FLASHCARD`: trả thẳng kết quả của `pickDueWords`.
- Chế độ `QUIZ`: với mỗi từ, chọn chiều theo `rand()` — dưới 0.5 là `EN_TO_VI` (hỏi từ tiếng Anh, chọn nghĩa tiếng Việt), còn lại là `VI_TO_EN`. `prompt` là `headword` hoặc `meaningVi` tuỳ chiều; `phonetic` chỉ gửi khi chiều `EN_TO_VI` (chiều ngược lại mà lộ phiên âm là lộ đáp án).
- **Không gửi chỉ số đáp án xuống client.** Mỗi lựa chọn mang `id` của từ nguồn; lựa chọn đúng là cái có `id === wordId`. Bốn lựa chọn được trộn theo `rand`.
- Từ nào không gom đủ nhiễu (`pickDistractors` ném `NOT_ENOUGH_WORDS`) thì **bỏ qua từ đó**, phiên vẫn chạy với các từ còn lại. Có từ để ôn nhưng không dựng được câu nào thì ném `Error("NOT_ENOUGH_WORDS")`. Sổ tay rỗng thì trả phiên rỗng, không ném lỗi.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/start-session.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { startVocabSession } from "./start-session";

const NOW = new Date("2026-09-05T00:00:00.000Z");

function userWordRow(wordId: string, headword: string, meaningVi: string) {
  return {
    wordId,
    sourceContext: null,
    word: { headword, phonetic: "/x/", pos: "n", meaningVi, exampleEn: null, exampleVi: null },
  };
}

/** Dãy số giả cho rand, quay vòng để không bao giờ hết. */
function randTu(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("startVocabSession", () => {
  it("chế độ thẻ trả về các từ đến hạn, không đụng tới bảng Word", async () => {
    const db = {
      userWord: { findMany: vi.fn(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: { findMany: vi.fn(async () => []) },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "FLASHCARD", now: NOW });

    expect(s.mode).toBe("FLASHCARD");
    expect(s.early).toBe(false);
    expect(s.items).toHaveLength(1);
    expect(db.word.findMany).not.toHaveBeenCalled();
  });

  it("chế độ trắc nghiệm dựng bốn lựa chọn, đáp án đúng mang id của từ", async () => {
    const db = {
      userWord: { findMany: vi.fn(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: {
        findMany: vi.fn(async () => [
          { id: "w2", headword: "book", meaningVi: "quyển sách" },
          { id: "w3", headword: "car", meaningVi: "xe hơi" },
          { id: "w4", headword: "dog", meaningVi: "con chó" },
        ]),
      },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0]) });
    if (s.mode !== "QUIZ") throw new Error("sai chế độ");

    const item = s.items[0];
    expect(item.wordId).toBe("w1");
    expect(item.direction).toBe("EN_TO_VI");
    expect(item.prompt).toBe("apple");
    expect(item.choices).toHaveLength(4);
    expect(item.choices.map((c) => c.text)).toContain("quả táo");
    expect(item.choices.filter((c) => c.id === "w1")).toHaveLength(1);
    // Không được lộ đáp án dưới bất kỳ tên trường nào
    expect(JSON.stringify(item)).not.toContain("answer");
  });

  it("chiều Việt sang Anh hỏi bằng nghĩa và không lộ phiên âm", async () => {
    const db = {
      userWord: { findMany: vi.fn(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: {
        findMany: vi.fn(async () => [
          { id: "w2", headword: "book", meaningVi: "quyển sách" },
          { id: "w3", headword: "car", meaningVi: "xe hơi" },
          { id: "w4", headword: "dog", meaningVi: "con chó" },
        ]),
      },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0.9, 0]) });
    if (s.mode !== "QUIZ") throw new Error("sai chế độ");

    expect(s.items[0].direction).toBe("VI_TO_EN");
    expect(s.items[0].prompt).toBe("quả táo");
    expect(s.items[0].phonetic).toBeNull();
    expect(s.items[0].choices.map((c) => c.text)).toContain("apple");
  });

  it("từ không gom đủ nhiễu thì bị bỏ qua, phiên vẫn chạy với từ còn lại", async () => {
    const findManyWord = vi.fn(async () => []);
    findManyWord
      .mockResolvedValueOnce([] as never) // w1: từ đã lưu — không có
      .mockResolvedValueOnce([] as never) // w1: từ chung — cũng không có, bỏ qua w1
      .mockResolvedValueOnce([] as never) // w2: từ đã lưu
      .mockResolvedValueOnce([
        { id: "w3", headword: "car", meaningVi: "xe hơi" },
        { id: "w4", headword: "dog", meaningVi: "con chó" },
        { id: "w5", headword: "egg", meaningVi: "quả trứng" },
      ] as never);

    const db = {
      userWord: {
        findMany: vi.fn(async () => [userWordRow("w1", "apple", "quả táo"), userWordRow("w2", "book", "quyển sách")]),
      },
      word: { findMany: findManyWord },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0]) });
    if (s.mode !== "QUIZ") throw new Error("sai chế độ");

    expect(s.items).toHaveLength(1);
    expect(s.items[0].wordId).toBe("w2");
  });

  it("có từ để ôn nhưng không dựng được câu nào thì ném NOT_ENOUGH_WORDS", async () => {
    const db = {
      userWord: { findMany: vi.fn(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: { findMany: vi.fn(async () => []) },
    };
    await expect(
      startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0]) }),
    ).rejects.toThrow("NOT_ENOUGH_WORDS");
  });

  it("chưa lưu từ nào thì phiên rỗng, không ném lỗi", async () => {
    const db = {
      userWord: { findMany: vi.fn(async () => []) },
      word: { findMany: vi.fn(async () => []) },
    };
    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW });
    expect(s.items).toEqual([]);
    expect(s.early).toBe(true);
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/start-session.test.ts`
Mong đợi: FAIL, không tìm thấy module `./start-session`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/start-session.ts`:

```ts
import { pickDueWords, type DueWord, type PickDueDb } from "./pick-due";
import { pickDistractors, type Distractor, type DistractorDb } from "./pick-distractors";

export type SessionDb = PickDueDb & DistractorDb;

export type ReviewMode = "FLASHCARD" | "QUIZ";
export type Direction = "EN_TO_VI" | "VI_TO_EN";

export type QuizChoice = { id: string; text: string };

/** Một câu trắc nghiệm gửi xuống client. Cố tình không có trường đáp án. */
export type QuizItem = {
  wordId: string;
  direction: Direction;
  prompt: string;
  phonetic: string | null;
  choices: QuizChoice[];
};

export type VocabSession =
  | { mode: "FLASHCARD"; early: boolean; items: DueWord[] }
  | { mode: "QUIZ"; early: boolean; items: QuizItem[] };

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function textOf(direction: Direction, w: { headword: string; meaningVi: string }): string {
  return direction === "EN_TO_VI" ? w.meaningVi : w.headword;
}

function buildQuizItem(word: DueWord, distractors: Distractor[], direction: Direction, rand: () => number): QuizItem {
  const choices = shuffle(
    [
      { id: word.wordId, text: textOf(direction, word) },
      ...distractors.map((d) => ({ id: d.id, text: textOf(direction, d) })),
    ],
    rand,
  );
  return {
    wordId: word.wordId,
    direction,
    prompt: direction === "EN_TO_VI" ? word.headword : word.meaningVi,
    // Chiều Việt → Anh mà hiện phiên âm là lộ đáp án
    phonetic: direction === "EN_TO_VI" ? word.phonetic : null,
    choices,
  };
}

/**
 * Dựng sẵn cả một phiên ôn trong một lần gọi, để trang server chỉ cần truyền
 * xuống component client — không có màn hình chờ giữa chừng.
 */
export async function startVocabSession(
  db: SessionDb,
  p: { userId: string; mode: ReviewMode; now?: Date; rand?: () => number },
): Promise<VocabSession> {
  const rand = p.rand ?? Math.random;
  const { early, words } = await pickDueWords(db, { userId: p.userId, now: p.now });

  if (p.mode === "FLASHCARD") return { mode: "FLASHCARD", early, items: words };

  const items: QuizItem[] = [];
  for (const w of words) {
    const direction: Direction = rand() < 0.5 ? "EN_TO_VI" : "VI_TO_EN";
    try {
      const distractors = await pickDistractors(db, {
        userId: p.userId,
        word: { id: w.wordId, pos: w.pos, meaningVi: w.meaningVi },
        rand,
      });
      items.push(buildQuizItem(w, distractors, direction, rand));
    } catch (e) {
      // Từ điển chưa đủ từ cùng loại: bỏ qua từ này, phiên vẫn chạy tiếp
      if (e instanceof Error && e.message === "NOT_ENOUGH_WORDS") continue;
      throw e;
    }
  }
  if (items.length === 0 && words.length > 0) throw new Error("NOT_ENOUGH_WORDS");
  return { mode: "QUIZ", early, items };
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/start-session.test.ts`
Mong đợi: PASS, 6 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/start-session.ts src/features/vocab/start-session.test.ts
git commit -m "feat: dựng phiên ôn thẻ và phiên trắc nghiệm hai chiều"
```

---

### Task 7: Chấm một câu trắc nghiệm

**Files:**
- Create: `src/features/vocab/answer-quiz.ts`
- Test: `src/features/vocab/answer-quiz.test.ts`

**Interfaces:**
- Consumes: `reviewWord` từ `./review-word` (Task 3); `QUALITY` từ `./sm2` (Task 1); `Direction` từ `./start-session` (Task 6).
- Produces:
  - `type AnswerQuizDb = Pick<PrismaClient, "userWord" | "word">`
  - `type QuizAnswerResult = { isCorrect: boolean; correctId: string; correctText: string; dueAt: Date }`
  - `function answerQuizWord(db: AnswerQuizDb, p: { userId: string; wordId: string; chosenId: string; direction: Direction; now?: Date }): Promise<QuizAnswerResult>`

**Yêu cầu:** Đúng khi `chosenId === wordId` — server tự biết đáp án nên client không cần giữ. Đúng thì chấm `QUALITY.QUIZ_CORRECT` (4), sai thì `QUALITY.QUIZ_WRONG` (1); giá trị 1 khiến `reviewSm2` tự đặt lại `intervalDays = 1` và `repetitions = 0`, đúng như spec mục 4.4 yêu cầu. Trả về chữ của đáp án đúng theo chiều đang hỏi để client hiện ra. Từ không tồn tại thì ném `Error("NOT_FOUND")`.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/features/vocab/answer-quiz.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { answerQuizWord } from "./answer-quiz";
import { QUALITY } from "./sm2";

const NOW = new Date("2026-09-05T00:00:00.000Z");
const NGAY = 24 * 60 * 60 * 1000;

function fakeDb(word: { headword: string; meaningVi: string } | null) {
  return {
    word: { findUnique: vi.fn(async () => word) },
    userWord: {
      findUnique: vi.fn(async () => ({
        id: "uw1",
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
        dueAt: new Date(NOW.getTime() - NGAY),
      })),
      update: vi.fn(async () => ({})),
    },
  };
}

describe("answerQuizWord", () => {
  it("chọn đúng thì chấm chất lượng 4 và khoảng cách giãn ra", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });

    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosenId: "w1", direction: "EN_TO_VI", now: NOW });

    expect(r.isCorrect).toBe(true);
    expect(r.correctId).toBe("w1");
    expect(r.correctText).toBe("quả táo");
    const data = (db.userWord.update.mock.calls[0][0] as { data: { intervalDays: number; repetitions: number } }).data;
    expect(data.repetitions).toBe(3);
    expect(data.intervalDays).toBe(15); // round(6 * 2.5)
  });

  it("chọn sai thì đặt lại lịch về 1 ngày và repetitions 0", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });

    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosenId: "w9", direction: "EN_TO_VI", now: NOW });

    expect(r.isCorrect).toBe(false);
    const data = (db.userWord.update.mock.calls[0][0] as { data: { intervalDays: number; repetitions: number } }).data;
    expect(data.intervalDays).toBe(1);
    expect(data.repetitions).toBe(0);
    expect(r.dueAt.toISOString()).toBe(new Date(NOW.getTime() + NGAY).toISOString());
  });

  it("chiều Việt sang Anh thì đáp án hiện ra là từ tiếng Anh", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });
    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosenId: "w1", direction: "VI_TO_EN", now: NOW });
    expect(r.correctText).toBe("apple");
  });

  it("chất lượng dùng đúng hằng số của SM-2", () => {
    expect(QUALITY.QUIZ_CORRECT).toBe(4);
    expect(QUALITY.QUIZ_WRONG).toBe(1);
  });

  it("từ không tồn tại thì ném NOT_FOUND và không ghi gì", async () => {
    const db = fakeDb(null);
    await expect(
      answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosenId: "w1", direction: "EN_TO_VI", now: NOW }),
    ).rejects.toThrow("NOT_FOUND");
    expect(db.userWord.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/vocab/answer-quiz.test.ts`
Mong đợi: FAIL, không tìm thấy module `./answer-quiz`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/features/vocab/answer-quiz.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { QUALITY } from "./sm2";
import { reviewWord } from "./review-word";
import type { Direction } from "./start-session";

export type AnswerQuizDb = Pick<PrismaClient, "userWord" | "word">;

export type QuizAnswerResult = { isCorrect: boolean; correctId: string; correctText: string; dueAt: Date };

/**
 * Chấm một câu trắc nghiệm rồi cập nhật SM-2.
 * Đáp án đúng là lựa chọn mang id của chính từ đang hỏi, nên server không cần
 * nhớ phiên và client cũng không bao giờ cầm sẵn đáp án.
 */
export async function answerQuizWord(
  db: AnswerQuizDb,
  p: { userId: string; wordId: string; chosenId: string; direction: Direction; now?: Date },
): Promise<QuizAnswerResult> {
  const word = await db.word.findUnique({ where: { id: p.wordId }, select: { headword: true, meaningVi: true } });
  if (!word) throw new Error("NOT_FOUND");

  const isCorrect = p.chosenId === p.wordId;
  const r = await reviewWord(db, {
    userId: p.userId,
    wordId: p.wordId,
    quality: isCorrect ? QUALITY.QUIZ_CORRECT : QUALITY.QUIZ_WRONG,
    now: p.now,
  });

  return {
    isCorrect,
    correctId: p.wordId,
    correctText: p.direction === "EN_TO_VI" ? word.meaningVi : word.headword,
    dueAt: r.dueAt,
  };
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/vocab/answer-quiz.test.ts`
Mong đợi: PASS, 5 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/vocab/answer-quiz.ts src/features/vocab/answer-quiz.test.ts
git commit -m "feat: chấm câu trắc nghiệm từ vựng và cập nhật SM-2"
```

---

### Task 8: Ba route handler cho từ vựng

**Files:**
- Create: `src/app/api/vocab/review/route.ts`
- Create: `src/app/api/vocab/quiz/route.ts`
- Create: `src/app/api/vocab/saved/[wordId]/route.ts`
- Modify: `src/lib/api-errors.ts` (thêm một dòng vào bảng `STATUS`)
- Test: `src/app/api/vocab/review/route.test.ts`
- Test: `src/app/api/vocab/quiz/route.test.ts`

**Interfaces:**
- Consumes: `reviewWord` (Task 3), `removeUserWord` (Task 4), `answerQuizWord` (Task 7), `QUALITY` (Task 1), `errorToResponse` từ `@/lib/api-errors`.
- Produces:
  - `POST /api/vocab/review` — body `{ wordId: string, grade: "FORGOT" | "HARD" | "EASY" }` → `{ dueAt: string, intervalDays: number, early: boolean }`
  - `POST /api/vocab/quiz` — body `{ wordId: string, chosenId: string, direction: "EN_TO_VI" | "VI_TO_EN" }` → `{ isCorrect: boolean, correctId: string, correctText: string, dueAt: string }`
  - `DELETE /api/vocab/saved/[wordId]` → `{ removed: true }` hoặc 404

**Yêu cầu:** Route là lớp mỏng đúng khuôn `src/app/api/drill/start/route.ts`: `auth()` → `zod` parse body → gọi hàm nghiệp vụ với `prisma` thật → `errorToResponse` map mã lỗi. Chưa đăng nhập trả 401 `UNAUTHORIZED`, body sai trả 400 `INVALID`. Thêm `NOT_ENOUGH_WORDS: 409` vào bảng `STATUS` trong `src/lib/api-errors.ts` (đặt ngay dưới dòng `NOT_ENOUGH_QUESTIONS`).

Đường dẫn xoá đặt ở `saved/[wordId]` chứ không phải `[wordId]` để không nằm cùng cấp với route tĩnh `/api/vocab/save` đã có.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/app/api/vocab/review/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, reviewWordMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string; role: string } } | null> => ({ user: { id: "u1", role: "USER" } })),
  reviewWordMock: vi.fn(async () => ({ intervalDays: 1, dueAt: new Date("2026-09-06T00:00:00.000Z"), early: false })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/vocab/review-word", () => ({ reviewWord: reviewWordMock }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/vocab/review", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/vocab/review", () => {
  it("chấm thẻ dễ thì gọi SM-2 với chất lượng 5 và trả lịch mới", async () => {
    const res = await POST(req({ wordId: "w1", grade: "EASY" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ dueAt: "2026-09-06T00:00:00.000Z", intervalDays: 1, early: false });
    expect(reviewWordMock).toHaveBeenCalledWith({}, { userId: "u1", wordId: "w1", quality: 5 });
  });

  it("chấm quên thì dùng chất lượng 1", async () => {
    await POST(req({ wordId: "w1", grade: "FORGOT" }));
    expect(reviewWordMock).toHaveBeenLastCalledWith({}, { userId: "u1", wordId: "w1", quality: 1 });
  });

  it("mức đánh giá lạ thì trả 400", async () => {
    const res = await POST(req({ wordId: "w1", grade: "SIEU_DE" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });

  it("chưa đăng nhập thì trả 401", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(req({ wordId: "w1", grade: "EASY" }));
    expect(res.status).toBe(401);
  });

  it("chưa lưu từ đó thì trả 404", async () => {
    reviewWordMock.mockRejectedValueOnce(new Error("NOT_FOUND"));
    const res = await POST(req({ wordId: "w1", grade: "EASY" }));
    expect(res.status).toBe(404);
  });
});
```

Tạo `src/app/api/vocab/quiz/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, answerMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string; role: string } } | null> => ({ user: { id: "u1", role: "USER" } })),
  answerMock: vi.fn(async () => ({
    isCorrect: true,
    correctId: "w1",
    correctText: "quả táo",
    dueAt: new Date("2026-09-20T00:00:00.000Z"),
  })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/vocab/answer-quiz", () => ({ answerQuizWord: answerMock }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/vocab/quiz", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/vocab/quiz", () => {
  it("chấm câu trắc nghiệm và trả đáp án đúng cho client hiện ra", async () => {
    const res = await POST(req({ wordId: "w1", chosenId: "w1", direction: "EN_TO_VI" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      isCorrect: true,
      correctId: "w1",
      correctText: "quả táo",
      dueAt: "2026-09-20T00:00:00.000Z",
    });
    expect(answerMock).toHaveBeenCalledWith({}, { userId: "u1", wordId: "w1", chosenId: "w1", direction: "EN_TO_VI" });
  });

  it("chiều dịch lạ thì trả 400", async () => {
    const res = await POST(req({ wordId: "w1", chosenId: "w1", direction: "EN_TO_JP" }));
    expect(res.status).toBe(400);
  });

  it("chưa đăng nhập thì trả 401", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(req({ wordId: "w1", chosenId: "w1", direction: "EN_TO_VI" }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/app/api/vocab`
Mong đợi: FAIL, không tìm thấy hai module `./route`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Sửa `src/lib/api-errors.ts`, thêm một dòng vào bảng `STATUS` ngay dưới `NOT_ENOUGH_QUESTIONS: 409,`:

```ts
  NOT_ENOUGH_WORDS: 409,
```

Tạo `src/app/api/vocab/review/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { reviewWord } from "@/features/vocab/review-word";
import { QUALITY } from "@/features/vocab/sm2";

const bodySchema = z.object({
  wordId: z.string().min(1),
  grade: z.enum(["FORGOT", "HARD", "EASY"]),
});

const CHAT_LUONG = { FORGOT: QUALITY.FORGOT, HARD: QUALITY.HARD, EASY: QUALITY.EASY } as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await reviewWord(prisma, {
      userId: session.user.id,
      wordId: parsed.data.wordId,
      quality: CHAT_LUONG[parsed.data.grade],
    });
    return NextResponse.json({ dueAt: r.dueAt.toISOString(), intervalDays: r.intervalDays, early: r.early });
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
```

Tạo `src/app/api/vocab/quiz/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { answerQuizWord } from "@/features/vocab/answer-quiz";

const bodySchema = z.object({
  wordId: z.string().min(1),
  chosenId: z.string().min(1),
  direction: z.enum(["EN_TO_VI", "VI_TO_EN"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await answerQuizWord(prisma, { userId: session.user.id, ...parsed.data });
    return NextResponse.json({
      isCorrect: r.isCorrect,
      correctId: r.correctId,
      correctText: r.correctText,
      dueAt: r.dueAt.toISOString(),
    });
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
```

Tạo `src/app/api/vocab/saved/[wordId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeUserWord } from "@/features/vocab/remove-word";

export async function DELETE(_req: Request, { params }: { params: Promise<{ wordId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { wordId } = await params;
  const r = await removeUserWord(prisma, { userId: session.user.id, wordId });
  if (!r.removed) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(r);
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/app/api/vocab`
Mong đợi: PASS, 8 test mới cộng 2 test cũ của `save/route.test.ts`.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/app/api/vocab src/lib/api-errors.ts
git commit -m "feat: route chấm thẻ, chấm trắc nghiệm và xoá từ đã lưu"
```

---

### Task 9: Trang danh sách từ đã lưu

**Files:**
- Create: `src/components/vocab/due-label.ts`
- Create: `src/components/vocab/due-label.test.ts`
- Create: `src/components/vocab/VocabList.tsx`
- Create: `src/components/vocab/VocabList.test.tsx`
- Modify: `src/app/vocab/page.tsx` (thay toàn bộ `ComingSoon`)

**Interfaces:**
- Consumes: `listUserWords`, `countDueWords` (Task 4); `DELETE /api/vocab/saved/[wordId]` (Task 8).
- Produces:
  - `function dueLabel(dueAt: string, now: Date): string`
  - `type VocabListItem = { wordId: string; headword: string; phonetic: string | null; pos: string | null; meaningVi: string; sourceContext: string | null; dueAt: string }`
  - `function VocabList(props: { items: VocabListItem[]; total: number; page: number; pageSize: number; q: string; now: string }): JSX.Element`

**Yêu cầu:** `VocabList` là client component. Mốc "bây giờ" do trang server truyền xuống qua prop `now` (chuỗi ISO) để lần render trên server và trên trình duyệt ra cùng một chữ. Ô tìm là `<form>` gửi bằng `router.push("/vocab?q=...")`; xoá thì gọi `fetch(..., { method: "DELETE" })` rồi `router.refresh()`. Danh sách rỗng thì hướng dẫn người dùng cách lưu từ. Phân trang chỉ hiện khi `total > pageSize`.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/components/vocab/due-label.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { dueLabel } from "./due-label";

const NOW = new Date("2026-09-05T00:00:00.000Z");
const NGAY = 24 * 60 * 60 * 1000;

describe("dueLabel", () => {
  it("đã quá hạn thì báo đến hạn", () => {
    expect(dueLabel(new Date(NOW.getTime() - 5 * NGAY).toISOString(), NOW)).toBe("Đến hạn");
  });

  it("đúng lúc này cũng là đến hạn", () => {
    expect(dueLabel(NOW.toISOString(), NOW)).toBe("Đến hạn");
  });

  it("còn một ngày thì dùng số ít", () => {
    expect(dueLabel(new Date(NOW.getTime() + NGAY).toISOString(), NOW)).toBe("Còn 1 ngày");
  });

  it("còn nhiều ngày thì đếm số ngày, làm tròn lên", () => {
    expect(dueLabel(new Date(NOW.getTime() + 2.3 * NGAY).toISOString(), NOW)).toBe("Còn 3 ngày");
  });
});
```

Tạo `src/components/vocab/VocabList.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VocabList } from "./VocabList";

const { pushMock, refreshMock } = vi.hoisted(() => ({ pushMock: vi.fn(), refreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));

const NOW = "2026-09-05T00:00:00.000Z";

const TU = {
  wordId: "w1",
  headword: "apple",
  phonetic: "/ˈæp.əl/",
  pos: "n",
  meaningVi: "quả táo",
  sourceContext: "I ate an apple.",
  dueAt: "2026-09-08T00:00:00.000Z",
};

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ removed: true }), { status: 200 })));
});

describe("VocabList", () => {
  it("hiện từ, nghĩa, phiên âm và hạn ôn", () => {
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByText("Còn 3 ngày")).toBeInTheDocument();
  });

  it("chưa lưu từ nào thì hướng dẫn cách lưu", () => {
    render(<VocabList items={[]} total={0} page={1} pageSize={20} q="" now={NOW} />);
    expect(screen.getByText(/Bôi đen một từ tiếng Anh/)).toBeInTheDocument();
  });

  it("tìm kiếm đẩy từ khoá lên URL", async () => {
    const user = userEvent.setup();
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    await user.type(screen.getByLabelText("Tìm từ đã lưu"), "táo");
    await user.click(screen.getByRole("button", { name: "Tìm" }));
    expect(pushMock).toHaveBeenCalledWith(`/vocab?q=${encodeURIComponent("táo")}`);
  });

  it("xoá từ thì gọi API rồi làm mới danh sách", async () => {
    const user = userEvent.setup();
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    await user.click(screen.getByRole("button", { name: "Xoá từ apple" }));
    expect(fetch).toHaveBeenCalledWith("/api/vocab/saved/w1", { method: "DELETE" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("chỉ một trang thì không hiện nút chuyển trang", () => {
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    expect(screen.queryByRole("button", { name: "Trang sau" })).not.toBeInTheDocument();
  });

  it("nhiều trang thì chuyển trang giữ nguyên từ khoá tìm", async () => {
    const user = userEvent.setup();
    render(<VocabList items={[TU]} total={45} page={2} pageSize={20} q="táo" now={NOW} />);
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(pushMock).toHaveBeenCalledWith(`/vocab?q=${encodeURIComponent("táo")}&page=3`);
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/components/vocab`
Mong đợi: FAIL, không tìm thấy `./due-label` và `./VocabList`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/components/vocab/due-label.ts`:

```ts
const MS_MOT_NGAY = 24 * 60 * 60 * 1000;

/** Nhãn ngắn cho hạn ôn của một từ. `now` truyền từ ngoài vào để server và client hiện giống nhau. */
export function dueLabel(dueAt: string, now: Date): string {
  const soNgay = Math.ceil((new Date(dueAt).getTime() - now.getTime()) / MS_MOT_NGAY);
  if (soNgay <= 0) return "Đến hạn";
  if (soNgay === 1) return "Còn 1 ngày";
  return `Còn ${soNgay} ngày`;
}
```

Tạo `src/components/vocab/VocabList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { dueLabel } from "./due-label";

export type VocabListItem = {
  wordId: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  sourceContext: string | null;
  dueAt: string;
};

type Props = { items: VocabListItem[]; total: number; page: number; pageSize: number; q: string; now: string };

function urlCua(q: string, page: number) {
  const phan = [`q=${encodeURIComponent(q)}`];
  if (page > 1) phan.push(`page=${page}`);
  return `/vocab?${phan.join("&")}`;
}

export function VocabList({ items, total, page, pageSize, q, now }: Props) {
  const router = useRouter();
  const [tuKhoa, setTuKhoa] = useState(q);
  const [dangXoa, setDangXoa] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const mocNow = new Date(now);
  const soTrang = Math.max(1, Math.ceil(total / pageSize));

  async function xoa(wordId: string) {
    setDangXoa(wordId);
    setLoi(null);
    try {
      const res = await fetch(`/api/vocab/saved/${wordId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("fail");
      router.refresh();
    } catch {
      setLoi("Không xoá được, thử lại sau.");
    } finally {
      setDangXoa(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(urlCua(tuKhoa, 1));
        }}
      >
        <label htmlFor="tim-tu" className="sr-only">Tìm từ đã lưu</label>
        <input
          id="tim-tu"
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm theo từ hoặc nghĩa"
          className="flex-1 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">Tìm</button>
      </form>

      {loi && <p className="text-sm text-danger">{loi}</p>}

      {items.length === 0 ? (
        <p className="card p-6 text-muted">
          {q
            ? `Không tìm thấy từ nào khớp "${q}".`
            : "Chưa lưu từ nào. Bôi đen một từ tiếng Anh ở bất kỳ trang nào rồi bấm Lưu từ trong popup dịch."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((t) => (
            <li key={t.wordId} className="card flex items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-lg font-bold">{t.headword}</span>
                  {t.phonetic && <span className="text-sm text-muted">{t.phonetic}</span>}
                  {t.pos && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{t.pos}</span>}
                </p>
                <p className="mt-1">{t.meaningVi}</p>
                {t.sourceContext && <p className="mt-1 text-sm italic text-muted">{t.sourceContext}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xs text-muted">{dueLabel(t.dueAt, mocNow)}</span>
                <button
                  type="button"
                  aria-label={`Xoá từ ${t.headword}`}
                  onClick={() => xoa(t.wordId)}
                  disabled={dangXoa === t.wordId}
                  className="rounded-lg border border-line p-2 text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => router.push(urlCua(q, page - 1))}
            className="rounded-lg border border-line px-4 py-2 hover:bg-surface-2 disabled:opacity-40"
          >
            Trang trước
          </button>
          <span className="text-muted">Trang {page}/{soTrang}</span>
          <button
            type="button"
            disabled={page >= soTrang}
            onClick={() => router.push(urlCua(q, page + 1))}
            className="rounded-lg border border-line px-4 py-2 hover:bg-surface-2 disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}
```

Thay toàn bộ nội dung `src/app/vocab/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrainCircuit, Layers, ListChecks } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listUserWords } from "@/features/vocab/list-words";
import { countDueWords } from "@/features/vocab/count-due";
import { VocabList } from "@/components/vocab/VocabList";

export const metadata: Metadata = { title: "Từ vựng" };

export default async function VocabPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const [trang, dem] = await Promise.all([
    listUserWords(prisma, { userId: session.user.id, q: sp.q, page: Number(sp.page) || 1 }),
    countDueWords(prisma, { userId: session.user.id, now }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <BrainCircuit size={26} className="text-accent-text" aria-hidden="true" />
          Từ vựng
        </h1>
        <p className="mt-2 text-muted">
          {dem.saved === 0
            ? "Sổ tay còn trống."
            : dem.due > 0
              ? `Bạn đã lưu ${dem.saved} từ, trong đó ${dem.due} từ đến hạn ôn hôm nay.`
              : `Bạn đã lưu ${dem.saved} từ. Hôm nay không còn từ nào đến hạn.`}
        </p>
      </header>

      {dem.saved > 0 && (
        <div className="flex flex-wrap gap-3">
          <Link href="/vocab/flashcard" className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold">
            <Layers size={18} aria-hidden="true" />
            Ôn thẻ
          </Link>
          <Link href="/vocab/quiz" className="flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2">
            <ListChecks size={18} aria-hidden="true" />
            Trắc nghiệm
          </Link>
        </div>
      )}

      <VocabList
        items={trang.items.map((t) => ({ ...t, dueAt: t.dueAt.toISOString() }))}
        total={trang.total}
        page={trang.page}
        pageSize={trang.pageSize}
        q={sp.q ?? ""}
        now={now.toISOString()}
      />
    </div>
  );
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/components/vocab`
Mong đợi: PASS, 10 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/components/vocab src/app/vocab/page.tsx
git commit -m "feat: trang sổ tay từ vựng với tìm kiếm, xoá và phân trang"
```

---

### Task 10: Phiên ôn thẻ

**Files:**
- Create: `src/lib/speak.ts`
- Modify: `src/components/translate-popup/PopupContent.tsx` (xoá hàm `speak` cục bộ ở dòng 9–15, import từ `@/lib/speak`)
- Create: `src/components/vocab/FlashcardSession.tsx`
- Create: `src/components/vocab/FlashcardSession.test.tsx`
- Create: `src/app/vocab/flashcard/page.tsx`

**Interfaces:**
- Consumes: `startVocabSession` (Task 6), `DueWord` từ `@/features/vocab/pick-due` (Task 2); `POST /api/vocab/review` (Task 8).
- Produces:
  - `function speak(text: string): void`
  - `function FlashcardSession(props: { items: DueWord[]; early: boolean }): JSX.Element`

**Yêu cầu:** Mặt trước hiện `headword`, `phonetic` và nút phát âm; mặt sau hiện `meaningVi`, ví dụ và câu đã lưu kèm từ. Ba nút `Quên` / `Khó` / `Dễ` chỉ hiện sau khi lật thẻ, mỗi nút POST `/api/vocab/review` với `grade` tương ứng rồi sang thẻ kế. Hết thẻ thì hiện tổng kết kèm link về `/vocab`. Phiên rỗng thì báo chưa có từ để ôn. `early` thì hiện dòng chú thích về ôn sớm.

Hàm `speak` đang nằm cục bộ trong `PopupContent.tsx`; tách sang `src/lib/speak.ts` để hai chỗ dùng chung — đây là phần sửa có chủ ý, không phải refactor lan man.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/components/vocab/FlashcardSession.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardSession } from "./FlashcardSession";

vi.mock("@/lib/speak", () => ({ speak: vi.fn() }));

function tu(wordId: string, headword: string, meaningVi: string) {
  return {
    wordId,
    headword,
    phonetic: "/x/",
    pos: "n",
    meaningVi,
    exampleEn: "An example.",
    exampleVi: "Một ví dụ.",
    sourceContext: null,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ dueAt: "2026-09-06T00:00:00.000Z", intervalDays: 1, early: false }), { status: 200 })),
  );
});

describe("FlashcardSession", () => {
  it("mặt trước chỉ hiện từ, chưa lộ nghĩa", () => {
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("quả táo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dễ" })).not.toBeInTheDocument();
  });

  it("lật thẻ mới hiện nghĩa và ba nút tự đánh giá", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quên" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khó" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dễ" })).toBeInTheDocument();
  });

  it("chấm thẻ thì gửi đúng mức đánh giá rồi sang thẻ kế", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo"), tu("w2", "book", "quyển sách")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    await user.click(screen.getByRole("button", { name: "Khó" }));

    expect(fetch).toHaveBeenCalledWith("/api/vocab/review", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ wordId: "w1", grade: "HARD" });
    expect(await screen.findByText("book")).toBeInTheDocument();
  });

  it("hết thẻ thì hiện tổng kết", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    await user.click(screen.getByRole("button", { name: "Dễ" }));
    expect(await screen.findByText(/Đã ôn 1 thẻ/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sổ tay/i })).toHaveAttribute("href", "/vocab");
  });

  it("ôn sớm thì có dòng chú thích", () => {
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early />);
    expect(screen.getByText(/ôn sớm/i)).toBeInTheDocument();
  });

  it("không có từ nào thì báo chưa có gì để ôn", () => {
    render(<FlashcardSession items={[]} early />);
    expect(screen.getByText(/chưa có từ nào để ôn/i)).toBeInTheDocument();
  });

  it("gửi thất bại thì báo lỗi và giữ nguyên thẻ", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    await user.click(screen.getByRole("button", { name: "Dễ" }));
    expect(await screen.findByText(/Không lưu được/)).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/components/vocab/FlashcardSession.test.tsx`
Mong đợi: FAIL, không tìm thấy `./FlashcardSession`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/lib/speak.ts`:

```ts
/** Phát âm bằng Web Speech API của trình duyệt — không tốn phí dịch vụ ngoài. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
```

Trong `src/components/translate-popup/PopupContent.tsx`, xoá hàm `speak` cục bộ (dòng 9–15) và thêm vào khối import đầu file:

```ts
import { speak } from "@/lib/speak";
```

Tạo `src/components/vocab/FlashcardSession.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speak";
import type { DueWord } from "@/features/vocab/pick-due";

type Grade = "FORGOT" | "HARD" | "EASY";

const NUT: { grade: Grade; nhan: string; mau: string }[] = [
  { grade: "FORGOT", nhan: "Quên", mau: "border-danger/50 text-danger hover:bg-danger/10" },
  { grade: "HARD", nhan: "Khó", mau: "border-line hover:bg-surface-2" },
  { grade: "EASY", nhan: "Dễ", mau: "border-accent/50 text-accent hover:bg-accent/10" },
];

export function FlashcardSession({ items, early }: { items: DueWord[]; early: boolean }) {
  const [idx, setIdx] = useState(0);
  const [lat, setLat] = useState(false);
  const [pending, setPending] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState(0);

  if (items.length === 0) {
    return (
      <section className="card p-8 text-center">
        <p className="text-muted">Chưa có từ nào để ôn. Hãy lưu vài từ trong popup dịch trước đã.</p>
        <Link href="/vocab" className="btn-primary mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold">Về sổ tay</Link>
      </section>
    );
  }

  if (idx >= items.length) {
    return (
      <section className="card p-8 text-center">
        <p className="text-2xl font-extrabold text-accent">Đã ôn {xong} thẻ</p>
        <p className="mt-2 text-muted">Lịch ôn của từng từ đã được cập nhật.</p>
        <Link href="/vocab" className="btn-primary mt-6 inline-block rounded-lg px-5 py-2 text-sm font-semibold">Về sổ tay</Link>
      </section>
    );
  }

  const the = items[idx];

  async function cham(grade: Grade) {
    setPending(true);
    setLoi(null);
    try {
      const res = await fetch("/api/vocab/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: the.wordId, grade }),
      });
      if (!res.ok) throw new Error("fail");
      setXong((n) => n + 1);
      setIdx((i) => i + 1);
      setLat(false);
    } catch {
      setLoi("Không lưu được kết quả, thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Thẻ {idx + 1}/{items.length}</span>
        {early && <span>Bạn đang ôn sớm — lịch ôn sẽ không bị đẩy xa thêm.</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <section className="card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-4xl font-extrabold">{the.headword}</p>
        <div className="flex items-center gap-3 text-muted">
          {the.phonetic && <span>{the.phonetic}</span>}
          <button
            type="button"
            aria-label={`Phát âm ${the.headword}`}
            onClick={() => speak(the.headword)}
            className="rounded-lg border border-line p-1.5 hover:bg-surface-2"
          >
            <Volume2 size={18} aria-hidden="true" />
          </button>
        </div>

        {lat && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-xl">{the.meaningVi}</p>
            {the.exampleEn && <p className="text-sm italic text-muted">{the.exampleEn}</p>}
            {the.exampleVi && <p className="text-sm text-muted">{the.exampleVi}</p>}
            {the.sourceContext && <p className="mt-2 text-sm text-info">Bạn lưu từ này ở: {the.sourceContext}</p>}
          </div>
        )}
      </section>

      {loi && <p className="text-center text-sm text-danger">{loi}</p>}

      {lat ? (
        <div className="grid grid-cols-3 gap-2">
          {NUT.map((n) => (
            <button
              key={n.grade}
              type="button"
              onClick={() => cham(n.grade)}
              disabled={pending}
              className={`rounded-lg border px-4 py-3 font-semibold transition disabled:opacity-50 ${n.mau}`}
            >
              {n.nhan}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setLat(true)} className="btn-primary rounded-lg px-6 py-3 font-bold">
          Lật thẻ
        </button>
      )}
    </div>
  );
}
```

Tạo `src/app/vocab/flashcard/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startVocabSession } from "@/features/vocab/start-session";
import { FlashcardSession } from "@/components/vocab/FlashcardSession";

export const metadata: Metadata = { title: "Ôn thẻ" };

export default async function FlashcardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const phien = await startVocabSession(prisma, { userId: session.user.id, mode: "FLASHCARD" });
  if (phien.mode !== "FLASHCARD") throw new Error("WRONG_TYPE");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Ôn thẻ</h1>
      <FlashcardSession items={phien.items} early={phien.early} />
    </div>
  );
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/components/vocab src/components/translate-popup`
Mong đợi: PASS, 7 test mới; các test cũ của popup dịch vẫn xanh.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/lib/speak.ts src/components/translate-popup/PopupContent.tsx src/components/vocab/FlashcardSession.tsx src/components/vocab/FlashcardSession.test.tsx src/app/vocab/flashcard/page.tsx
git commit -m "feat: phiên ôn thẻ với tự đánh giá quên/khó/dễ"
```

---

### Task 11: Phiên trắc nghiệm hai chiều

**Files:**
- Create: `src/components/vocab/QuizSession.tsx`
- Create: `src/components/vocab/QuizSession.test.tsx`
- Create: `src/app/vocab/quiz/page.tsx`

**Interfaces:**
- Consumes: `startVocabSession`, `QuizItem` (Task 6); `POST /api/vocab/quiz` (Task 8).
- Produces: `function QuizSession(props: { items: QuizItem[]; early: boolean }): JSX.Element`

**Yêu cầu:** Hiện `prompt` kèm nhãn cho biết đang hỏi chiều nào. Bốn lựa chọn là nút; bấm một nút thì POST `/api/vocab/quiz` với `{ wordId, chosenId, direction }`, khoá các nút lại, tô xanh lựa chọn có `id === correctId` và tô đỏ lựa chọn sai vừa chọn. Nút "Câu tiếp" sang câu sau; câu cuối thì hiện tổng kết `số đúng / tổng`. Phiên rỗng thì báo chưa đủ từ để làm trắc nghiệm và mời ôn thẻ.

Trang server bắt `NOT_ENOUGH_WORDS` từ `startVocabSession` và hiện lời nhắc thay vì để lỗi 500 hắt ra.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/components/vocab/QuizSession.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizSession } from "./QuizSession";

const CAU_EN_VI = {
  wordId: "w1",
  direction: "EN_TO_VI" as const,
  prompt: "apple",
  phonetic: "/x/",
  choices: [
    { id: "w2", text: "quyển sách" },
    { id: "w1", text: "quả táo" },
    { id: "w3", text: "xe hơi" },
    { id: "w4", text: "con chó" },
  ],
};

const CAU_VI_EN = {
  wordId: "w5",
  direction: "VI_TO_EN" as const,
  prompt: "con mèo",
  phonetic: null,
  choices: [
    { id: "w5", text: "cat" },
    { id: "w6", text: "dog" },
    { id: "w7", text: "bird" },
    { id: "w8", text: "fish" },
  ],
};

function traLoi(isCorrect: boolean, correctText: string) {
  return new Response(JSON.stringify({ isCorrect, correctId: "w1", correctText, dueAt: "2026-09-20T00:00:00.000Z" }), { status: 200 });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => traLoi(true, "quả táo")));
});

describe("QuizSession", () => {
  it("hiện câu hỏi với bốn lựa chọn", () => {
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /quả táo|quyển sách|xe hơi|con chó/ })).toHaveLength(4);
  });

  it("chọn đáp án thì gửi id lựa chọn chứ không gửi chỉ số", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "quả táo" }));

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ wordId: "w1", chosenId: "w1", direction: "EN_TO_VI" });
  });

  it("chọn sai thì hiện đáp án đúng", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => traLoi(false, "quả táo")));
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "xe hơi" }));
    expect(await screen.findByText(/Chưa đúng/)).toBeInTheDocument();
  });

  it("đã trả lời thì không bấm lại được", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "quả táo" }));
    expect(await screen.findByRole("button", { name: "quả táo" })).toBeDisabled();
  });

  it("chiều Việt sang Anh ghi rõ đang hỏi từ tiếng Anh", () => {
    render(<QuizSession items={[CAU_VI_EN]} early={false} />);
    expect(screen.getByText(/Chọn từ tiếng Anh/)).toBeInTheDocument();
  });

  it("hết câu thì hiện số đúng trên tổng", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "quả táo" }));
    await user.click(await screen.findByRole("button", { name: "Xem kết quả" }));
    expect(await screen.findByText("1/1")).toBeInTheDocument();
  });

  it("không có câu nào thì mời chuyển sang ôn thẻ", () => {
    render(<QuizSession items={[]} early={false} />);
    expect(screen.getByRole("link", { name: /Ôn thẻ/ })).toHaveAttribute("href", "/vocab/flashcard");
  });
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/components/vocab/QuizSession.test.tsx`
Mong đợi: FAIL, không tìm thấy `./QuizSession`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Tạo `src/components/vocab/QuizSession.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuizItem } from "@/features/vocab/start-session";

type KetQua = { isCorrect: boolean; correctId: string; correctText: string };

export function QuizSession({ items, early }: { items: QuizItem[]; early: boolean }) {
  const [idx, setIdx] = useState(0);
  const [ketQua, setKetQua] = useState<KetQua | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [dung, setDung] = useState(0);
  const [pending, setPending] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xongHet, setXongHet] = useState(false);

  if (items.length === 0) {
    return (
      <section className="card p-8 text-center">
        <p className="text-muted">Chưa đủ từ để dựng câu trắc nghiệm. Sổ tay cần thêm từ cùng loại từ.</p>
        <Link href="/vocab/flashcard" className="btn-primary mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Ôn thẻ thay vào đó
        </Link>
      </section>
    );
  }

  if (xongHet) {
    return (
      <section className="card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">Kết quả</p>
        <p className="mt-3 text-6xl font-extrabold text-accent">{dung}/{items.length}</p>
        <Link href="/vocab" className="btn-primary mt-6 inline-block rounded-lg px-5 py-2 text-sm font-semibold">Về sổ tay</Link>
      </section>
    );
  }

  const cau = items[idx];
  const laCuoi = idx === items.length - 1;

  async function traLoi(chosenId: string) {
    if (ketQua || pending) return;
    setChon(chosenId);
    setPending(true);
    setLoi(null);
    try {
      const res = await fetch("/api/vocab/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: cau.wordId, chosenId, direction: cau.direction }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as KetQua;
      setKetQua(data);
      if (data.isCorrect) setDung((n) => n + 1);
    } catch {
      setChon(null);
      setLoi("Không gửi được câu trả lời. Hãy chọn lại.");
    } finally {
      setPending(false);
    }
  }

  function tiep() {
    if (laCuoi) {
      setXongHet(true);
      return;
    }
    setIdx((i) => i + 1);
    setKetQua(null);
    setChon(null);
  }

  const classCua = (id: string) => {
    if (!ketQua) return "border-line hover:bg-surface-2";
    if (id === ketQua.correctId) return "border-emerald-400/60 bg-emerald-400/10";
    if (id === chon) return "border-danger/60 bg-danger/10";
    return "border-line opacity-60";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Câu {idx + 1}/{items.length}</span>
        {early && <span>Bạn đang ôn sớm — lịch ôn sẽ không bị đẩy xa thêm.</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <section className="card flex flex-col gap-4 p-6">
        <p className="text-sm text-muted">
          {cau.direction === "EN_TO_VI" ? "Chọn nghĩa tiếng Việt đúng" : "Chọn từ tiếng Anh đúng"}
        </p>
        <p className="text-center text-3xl font-extrabold">{cau.prompt}</p>
        {cau.phonetic && <p className="text-center text-muted">{cau.phonetic}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {cau.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => traLoi(c.id)}
              disabled={ketQua !== null || pending}
              className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${classCua(c.id)}`}
            >
              {c.text}
            </button>
          ))}
        </div>
      </section>

      {loi && <p className="text-center text-sm text-danger">{loi}</p>}

      {ketQua && (
        <>
          <p className={`text-center text-lg font-bold ${ketQua.isCorrect ? "text-emerald-300" : "text-danger"}`}>
            {ketQua.isCorrect ? "Chính xác!" : `Chưa đúng — đáp án là ${ketQua.correctText}`}
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={tiep} className="btn-primary rounded-lg px-6 py-2.5 font-semibold">
              {laCuoi ? "Xem kết quả" : "Câu tiếp"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

Tạo `src/app/vocab/quiz/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startVocabSession, type QuizItem } from "@/features/vocab/start-session";
import { QuizSession } from "@/components/vocab/QuizSession";

export const metadata: Metadata = { title: "Trắc nghiệm từ vựng" };

export default async function QuizPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let items: QuizItem[] = [];
  let early = false;
  try {
    const phien = await startVocabSession(prisma, { userId: session.user.id, mode: "QUIZ" });
    if (phien.mode === "QUIZ") {
      items = phien.items;
      early = phien.early;
    }
  } catch (e) {
    // Từ điển chưa đủ từ cùng loại: để QuizSession hiện lời mời ôn thẻ thay vì lỗi 500
    if (!(e instanceof Error && e.message === "NOT_ENOUGH_WORDS")) throw e;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Trắc nghiệm từ vựng</h1>
      <QuizSession items={items} early={early} />
    </div>
  );
}
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/components/vocab/QuizSession.test.tsx`
Mong đợi: PASS, 7 test.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/components/vocab/QuizSession.tsx src/components/vocab/QuizSession.test.tsx src/app/vocab/quiz/page.tsx
git commit -m "feat: phiên trắc nghiệm từ vựng hai chiều Anh-Việt"
```

---

### Task 12: Thẻ "Số từ đến hạn ôn" trên dashboard

**Files:**
- Modify: `src/features/stats/load-dashboard.ts` (mở rộng `DashboardDb` và `Dashboard`)
- Modify: `src/features/stats/load-dashboard.test.ts` (fake `db` cần thêm `userWord`)
- Create: `src/components/dashboard/DueWordsCard.tsx`
- Create: `src/components/dashboard/DueWordsCard.test.tsx`
- Modify: `src/components/dashboard/DashboardView.tsx`
- Modify: `src/components/dashboard/DashboardView.test.tsx`

**Interfaces:**
- Consumes: `countDueWords` (Task 4).
- Produces:
  - `DashboardDb` mở rộng thành `Pick<PrismaClient, "attempt" | "attemptAnswer" | "userWord">`
  - `Dashboard` có thêm trường `vocab: { due: number; saved: number }`
  - `function DueWordsCard(props: { due: number; saved: number }): JSX.Element`

**Yêu cầu:** Đây là món nợ có chủ ý của Kế hoạch 3 (spec mục 4.1). `loadDashboard` gọi thêm `countDueWords` với cùng `now`. Thẻ hiện số từ đến hạn, tổng số từ đã lưu, và link mở thẳng `/vocab/flashcard` khi có từ đến hạn; chưa lưu từ nào thì hướng dẫn lưu từ trong popup dịch.

Trong `DashboardView`, đặt `DueWordsCard` cạnh `SuggestionList` thành một hàng ba cột: gợi ý chiếm hai cột, thẻ từ vựng một cột.

- [ ] **Bước 1: Viết test thất bại**

Tạo `src/components/dashboard/DueWordsCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DueWordsCard } from "./DueWordsCard";

describe("DueWordsCard", () => {
  it("có từ đến hạn thì hiện số và link mở phiên ôn thẻ", () => {
    render(<DueWordsCard due={7} saved={42} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/42 từ đã lưu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ôn ngay/ })).toHaveAttribute("href", "/vocab/flashcard");
  });

  it("đã ôn hết thì không mời ôn tiếp mà dẫn về sổ tay", () => {
    render(<DueWordsCard due={0} saved={42} />);
    expect(screen.getByText(/Hôm nay không còn từ nào đến hạn/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem sổ tay/ })).toHaveAttribute("href", "/vocab");
  });

  it("chưa lưu từ nào thì hướng dẫn cách lưu", () => {
    render(<DueWordsCard due={0} saved={0} />);
    expect(screen.getByText(/Bôi đen một từ tiếng Anh/)).toBeInTheDocument();
  });
});
```

Trong `src/features/stats/load-dashboard.test.ts`, hàm trợ giúp `fakeDb` (khoảng dòng 18–23) phải trả thêm nhánh `userWord`, nếu không `countDueWords` sẽ nổ. Thêm một dòng vào object nó trả về, ngay sau dòng `attemptAnswer: { findMany: ... },`:

```ts
    userWord: { count: vi.fn(async () => 0) },
```

Rồi thêm một test mới — test này cần đếm hai giá trị khác nhau nên dựng `db` trực tiếp thay vì dùng `fakeDb`:

```ts
it("gộp cả số từ vựng đến hạn vào dashboard", async () => {
  const count = vi.fn(async () => 0);
  count.mockResolvedValueOnce(4).mockResolvedValueOnce(30);
  const db = {
    attempt: { findMany: vi.fn(async () => []) },
    attemptAnswer: { findMany: vi.fn(async () => []) },
    userWord: { count },
  };
  const r = await loadDashboard(db as never, { userId: "u1", certificate: "toeic" });
  expect(r.vocab).toEqual({ due: 4, saved: 30 });
});
```

Trong `src/components/dashboard/DashboardView.test.tsx` có hai đối tượng `Dashboard` giả tên `empty` và `full`. Thêm dòng `vocab: { due: 0, saved: 0 },` vào cuối cả hai (nếu thiếu thì `npm run typecheck` sẽ đỏ), rồi thêm một test:

```tsx
it("hiện thẻ từ vựng đến hạn", () => {
  render(<DashboardView name="Thắng" data={{ ...empty, vocab: { due: 5, saved: 20 } }} />);
  expect(screen.getByRole("link", { name: /Ôn ngay/ })).toBeInTheDocument();
});
```

- [ ] **Bước 2: Chạy test để chắc chắn nó thất bại**

Chạy: `npm test -- src/features/stats src/components/dashboard`
Mong đợi: FAIL — không tìm thấy `./DueWordsCard`, và `r.vocab` là `undefined`.

- [ ] **Bước 3: Viết code tối thiểu cho test xanh**

Trong `src/features/stats/load-dashboard.ts`:

```ts
// thêm vào khối import
import { countDueWords } from "@/features/vocab/count-due";
```

Đổi kiểu `db` và bổ sung trường vào `Dashboard`:

```ts
export type DashboardDb = Pick<PrismaClient, "attempt" | "attemptAnswer" | "userWord">;
```

```ts
export type Dashboard = {
  certificate: string;
  latest: { attemptId: string; submittedAt: string; scores: ScoreResult } | null;
  history: ExamPoint[];
  bySection: SectionRate[];
  byTag: RateItem[];
  suggestions: Suggestion[];
  answered: number;
  vocab: { due: number; saved: number };
};
```

Ngay trước câu lệnh `return` cuối hàm `loadDashboard`, thêm:

```ts
  const vocab = await countDueWords(db, { userId: p.userId, now });
```

và thêm `vocab,` vào object trả về.

Tạo `src/components/dashboard/DueWordsCard.tsx`:

```tsx
import Link from "next/link";
import { BrainCircuit } from "lucide-react";

/** Thẻ "Số từ đến hạn ôn" của spec mục 4.1. */
export function DueWordsCard({ due, saved }: { due: number; saved: number }) {
  return (
    <section className="card flex flex-col p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <BrainCircuit size={20} className="text-accent-text" aria-hidden="true" />
        Từ đến hạn ôn
      </h2>

      {saved === 0 ? (
        <p className="mt-3 text-muted">Bôi đen một từ tiếng Anh ở bất kỳ trang nào rồi bấm Lưu từ trong popup dịch.</p>
      ) : due > 0 ? (
        <>
          <p className="mt-3 text-5xl font-extrabold text-accent">{due}</p>
          <p className="mt-1 text-sm text-muted">trên {saved} từ đã lưu</p>
          <Link href="/vocab/flashcard" className="btn-primary mt-4 self-start rounded-lg px-5 py-2 text-sm font-semibold">
            Ôn ngay
          </Link>
        </>
      ) : (
        <>
          <p className="mt-3 text-muted">Hôm nay không còn từ nào đến hạn.</p>
          <p className="mt-1 text-sm text-muted">{saved} từ đã lưu</p>
          <Link href="/vocab" className="mt-4 self-start rounded-lg border border-line px-5 py-2 text-sm font-medium hover:bg-surface-2">
            Xem sổ tay
          </Link>
        </>
      )}
    </section>
  );
}
```

Trong `src/components/dashboard/DashboardView.tsx`, thêm import:

```tsx
import { DueWordsCard } from "./DueWordsCard";
```

rồi thay dòng `<SuggestionList suggestions={data.suggestions} />` bằng:

```tsx
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SuggestionList suggestions={data.suggestions} />
        </div>
        <DueWordsCard due={data.vocab.due} saved={data.vocab.saved} />
      </div>
```

- [ ] **Bước 4: Chạy test để chắc chắn nó xanh**

Chạy: `npm test -- src/features/stats src/components/dashboard`
Mong đợi: PASS, 5 test mới cộng toàn bộ test cũ của dashboard.

- [ ] **Bước 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/features/stats src/components/dashboard
git commit -m "feat: dashboard hiện số từ đến hạn ôn"
```

---

### Task 13: Cập nhật tài liệu

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: toàn bộ các task trước.
- Produces: không có mã mới.

**Yêu cầu:** README bổ sung cách dùng tính năng từ vựng; CLAUDE.md bổ sung một đoạn kiến trúc để phiên làm việc sau nắm được luồng SM-2 mà không phải đọc lại toàn bộ code.

- [ ] **Bước 1: Sửa README.md**

Trong mục "Chạy lần đầu", thêm hai dòng sau dòng bắt đầu bằng `8. Thi thử:`:

```markdown
9. Từ vựng: bôi đen một từ tiếng Anh bất kỳ → **Lưu từ** trong popup → `/vocab`
10. Ôn từ: `/vocab` → **Ôn thẻ** (lật thẻ, tự đánh giá) hoặc **Trắc nghiệm** (4 lựa chọn, hai chiều)
```

Thêm một mục mới ngay trước mục "## Docker":

```markdown
## Ôn từ ngắt quãng

Mỗi từ lưu trong sổ tay có lịch ôn riêng theo thuật toán SM-2: trả lời đúng thì khoảng cách giữa hai lần ôn giãn dần (1 ngày → 6 ngày → nhân theo `easeFactor`), trả lời sai thì quay về 1 ngày. Mỗi phiên tối đa 20 thẻ, ưu tiên từ quá hạn lâu nhất.

Hết từ đến hạn vẫn ôn được — gọi là **ôn sớm**. Ôn sớm không đẩy lịch ra xa thêm: trả lời đúng thì giữ nguyên hạn cũ, trả lời sai vẫn kéo từ về ôn lại ngày mai.

Trắc nghiệm cần từ điển đủ dày: mỗi câu phải tìm được ba từ khác cùng loại từ và khác nghĩa. Sổ tay quá ít từ hoặc chưa nhập từ điển StarDict thì trang trắc nghiệm sẽ mời chuyển sang ôn thẻ.
```

- [ ] **Bước 2: Sửa CLAUDE.md**

Trong mục "Kiến trúc", thêm một đoạn ngay sau đoạn bắt đầu bằng `**Chứng chỉ & làm bài:**`:

```markdown
**Từ vựng và SM-2:** `src/features/vocab/sm2.ts` là hàm thuần duy nhất biết công thức SM-2 — không chạm database, không đọc đồng hồ. `review-word.ts` mới là chỗ quy `intervalDays` ra mốc `dueAt` và áp quy tắc ôn sớm (dueAt cũ còn ở tương lai thì lấy mốc sớm hơn giữa lịch cũ và lịch mới). Sửa công thức thì sửa `sm2.ts`, sửa cách hẹn lịch thì sửa `review-word.ts`. Phiên ôn dựng sẵn một lần bằng `start-session.ts` rồi trang server truyền thẳng xuống component client. Câu trắc nghiệm **không gửi chỉ số đáp án xuống client**: mỗi lựa chọn mang `id` của từ nguồn, đáp án đúng là lựa chọn có `id === wordId`, server tự đối chiếu khi chấm. Bảng `VocabQuizAnswer` trong spec cố tình chưa dựng — SM-2 cập nhật thẳng trên `UserWord`.
```

- [ ] **Bước 3: Kiểm tra toàn bộ rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add README.md CLAUDE.md
git commit -m "docs: hướng dẫn ôn từ ngắt quãng và ghi chú kiến trúc SM-2"
```
