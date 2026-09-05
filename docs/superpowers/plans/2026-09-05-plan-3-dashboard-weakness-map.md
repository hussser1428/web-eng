# Kế hoạch 3: Dashboard và bản đồ điểm yếu

> **Dành cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để làm theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để đánh dấu.

**Mục tiêu:** Người đã đăng nhập vào trang chủ thấy ngay điểm ước tính gần nhất, tiến bộ qua các lượt thi, tỉ lệ đúng theo phần thi và theo kỹ năng, cùng ba gợi ý luyện tập mở thẳng bài drill đúng chỗ yếu.

**Kiến trúc:** Một module nghiệp vụ thuần TypeScript `src/features/stats/` gồm hàm thuần `computeWeakness` (không chạm database) và hàm gom dữ liệu `loadDashboard` (nhận `db` qua tham số như mọi feature khác). Giao diện là các component thuần trình bày trong `src/components/dashboard/`, vẽ biểu đồ bằng SVG và div CSS, không thêm thư viện biểu đồ. Trang chủ `/` trở thành server component rẽ hai nhánh: khách xem `LandingHero`, người đã đăng nhập xem `DashboardView`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Prisma 6 / PostgreSQL, Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 4.1 Dashboard, mục 6 "Điểm yếu").

**Cố tình chưa làm:** thẻ "Số từ đến hạn ôn" trong spec mục 4.1 cần bảng `UserWord` (chưa dựng). Người dùng đã chốt để Kế hoạch 4 (từ vựng SM-2) làm thẻ này. Đây là thiếu sót có chủ ý, không phải bỏ quên.

## Ràng buộc chung

Mọi task đều phải tuân thủ các điều dưới đây; phần **Yêu cầu** của từng task ngầm bao gồm mục này.

- **Toàn bộ tiếng Việt:** giao diện, thông báo lỗi, tên test (`it("bỏ câu chưa trả lời")`), comment, commit message.
- **Phân lớp:** hàm trong `src/features/*` **luôn nhận `db` qua tham số**, gõ kiểu hẹp bằng `Pick<PrismaClient, ...>`, **không** import `prisma` singleton. Chỉ `src/app/**` mới được import `@/lib/prisma`.
- **Test nghiệp vụ dùng fake `db`** (object thường có `vi.fn()`), không mock module, không cần Postgres. Test component dùng jsdom mặc định.
- **File test nằm cạnh file nguồn**, đuôi `.test.ts` / `.test.tsx`.
- **Bảng màu hiện hành** (đã đổi ở commit `bec054e`): nền `bg-background`, thẻ dùng class `.card`, chữ phụ `text-muted`, viền `border-line`, nền phụ `bg-surface-2`, điểm nhấn `.text-accent` / `.btn-primary` / màu `accent`, lỗi `text-danger`, link phụ `text-info`. **Không** dùng `neon`, gradient chữ, hay class `.glow` — chúng đã bị xoá.
- **Không dùng emoji trong giao diện.** Cần icon thì import từ `lucide-react`, cỡ `size={18}` hoặc `size={20}`, kèm `aria-hidden="true"`.
- **Không thêm dependency mới.** Biểu đồ vẽ tay bằng SVG hoặc div.
- Node 22, npm. Alias `@/*` → `src/*`.
- Mỗi task kết thúc bằng: `npm test`, `npm run typecheck`, `npm run lint` đều sạch (được phép còn đúng 1 warning `<img>` đã biết ở `QuestionCard.tsx`, 0 error), rồi commit.

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `src/features/stats/weakness.ts` | Hàm thuần: từ danh sách câu đã làm → tỉ lệ đúng theo phần thi và theo skillTag, sắp yếu nhất trước. Không biết gì về database. |
| `src/features/stats/load-dashboard.ts` | Truy vấn database, ghép với `CertificateSpec` để có tên phần thi, chọn ba gợi ý, trả một DTO gọn cho trang. |
| `src/components/dashboard/ScoreCard.tsx` | Thẻ điểm ước tính của lượt thi gần nhất; có trạng thái rỗng. |
| `src/components/dashboard/ProgressSparkline.tsx` | Đường SVG điểm tổng qua các lượt thi. |
| `src/components/dashboard/WeaknessBars.tsx` | Danh sách thanh tỉ lệ đúng, dùng lại cho cả phần thi lẫn kỹ năng. |
| `src/components/dashboard/SuggestionList.tsx` | Ba gợi ý, mỗi gợi ý là link mở drill đúng phần và đúng tag. |
| `src/components/dashboard/DashboardView.tsx` | Ghép bốn thẻ trên thành trang; thuần trình bày nên test được. |
| `src/components/home/LandingHero.tsx` | Phần giới thiệu cho khách, tách nguyên từ `src/app/page.tsx` hiện tại. |
| `src/app/page.tsx` | Server component: `auth()` rồi rẽ nhánh khách / đã đăng nhập. |
| `src/components/drill/DrillSetupForm.tsx` | Thêm hai prop `defaultSection`, `defaultTag` để nhận gợi ý từ dashboard. |
| `src/app/drill/page.tsx` | Đọc `searchParams` và truyền xuống form. |

---

### Task 1: Hàm thuần tính điểm yếu

**Files:**
- Create: `src/features/stats/weakness.ts`
- Test: `src/features/stats/weakness.test.ts`

**Interfaces:**
- Consumes: không có (task đầu tiên, thuần TypeScript).
- Produces:
  - `type AnswerRow = { section: string; skillTags: string[]; isCorrect: boolean | null }`
  - `type RateItem = { key: string; correct: number; total: number; rate: number }`
  - `type Weakness = { bySection: RateItem[]; byTag: RateItem[] }`
  - `const MIN_TAG_ANSWERS = 5`
  - `function computeWeakness(rows: AnswerRow[]): Weakness`

**Yêu cầu:**
- Bỏ qua câu chưa trả lời (`isCorrect === null`) trước khi tính bất cứ thứ gì.
- `rate` là số thực trong khoảng 0–1 (`correct / total`), không làm tròn ở đây — component tự định dạng phần trăm.
- `bySection` không áp ngưỡng: phần thi nào đã làm câu nào cũng hiện.
- `byTag` chỉ giữ tag có `total >= MIN_TAG_ANSWERS` (spec mục 6).
- Một câu lỡ gắn trùng tag (`["ngữ pháp", "ngữ pháp"]`) chỉ được tính một lần.
- Cả hai danh sách sắp xếp **yếu nhất trước**; hai mục cùng tỉ lệ thì sắp theo `key` để kết quả ổn định giữa các lần chạy.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/features/stats/weakness.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeWeakness, MIN_TAG_ANSWERS, type AnswerRow } from "./weakness";

/** Tạo n câu giống nhau, trong đó `correct` câu đầu là đúng. */
function rows(section: string, tags: string[], total: number, correct: number): AnswerRow[] {
  return Array.from({ length: total }, (_, i) => ({ section, skillTags: tags, isCorrect: i < correct }));
}

describe("computeWeakness", () => {
  it("tính tỉ lệ đúng theo phần thi, yếu nhất đứng đầu", () => {
    const w = computeWeakness([
      ...rows("toeic.p5", [], 4, 3), // 75%
      ...rows("toeic.p7", [], 4, 1), // 25%
    ]);
    expect(w.bySection).toEqual([
      { key: "toeic.p7", correct: 1, total: 4, rate: 0.25 },
      { key: "toeic.p5", correct: 3, total: 4, rate: 0.75 },
    ]);
  });

  it("bỏ câu chưa trả lời", () => {
    const w = computeWeakness([
      { section: "toeic.p5", skillTags: [], isCorrect: true },
      { section: "toeic.p5", skillTags: [], isCorrect: null },
      { section: "toeic.p5", skillTags: [], isCorrect: null },
    ]);
    expect(w.bySection).toEqual([{ key: "toeic.p5", correct: 1, total: 1, rate: 1 }]);
  });

  it(`tag dưới ${MIN_TAG_ANSWERS} câu bị loại khỏi byTag`, () => {
    const w = computeWeakness([
      ...rows("toeic.p5", ["ngữ pháp"], 5, 1),
      ...rows("toeic.p5", ["từ vựng"], 4, 0),
    ]);
    expect(w.byTag.map((t) => t.key)).toEqual(["ngữ pháp"]);
  });

  it("tag trùng trong một câu chỉ tính một lần", () => {
    const w = computeWeakness(rows("toeic.p5", ["ngữ pháp", "ngữ pháp"], 5, 2));
    expect(w.byTag).toEqual([{ key: "ngữ pháp", correct: 2, total: 5, rate: 0.4 }]);
  });

  it("hai tag cùng tỉ lệ thì sắp theo tên cho ổn định", () => {
    const w = computeWeakness([
      ...rows("toeic.p5", ["suy luận"], 5, 1),
      ...rows("toeic.p5", ["danh động từ"], 5, 1),
    ]);
    expect(w.byTag.map((t) => t.key)).toEqual(["danh động từ", "suy luận"]);
  });

  it("không có câu nào thì trả hai danh sách rỗng", () => {
    expect(computeWeakness([])).toEqual({ bySection: [], byTag: [] });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Chạy: `npm test -- src/features/stats/weakness.test.ts`

Kỳ vọng: FAIL, báo không tìm thấy module `./weakness`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/features/stats/weakness.ts`:

```ts
/** Một câu người dùng đã gặp: thuộc phần thi nào, gắn kỹ năng gì, đúng hay sai. */
export type AnswerRow = { section: string; skillTags: string[]; isCorrect: boolean | null };

/** Tỉ lệ đúng của một nhóm (phần thi hoặc kỹ năng). `rate` trong khoảng 0–1. */
export type RateItem = { key: string; correct: number; total: number; rate: number };

export type Weakness = { bySection: RateItem[]; byTag: RateItem[] };

/** Kỹ năng phải có ít nhất ngần này câu đã làm mới được xét (spec mục 6). */
export const MIN_TAG_ANSWERS = 5;

function tally(rows: AnswerRow[], keysOf: (r: AnswerRow) => string[]): RateItem[] {
  const map = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    for (const key of new Set(keysOf(r))) {
      const cur = map.get(key) ?? { correct: 0, total: 0 };
      cur.total++;
      if (r.isCorrect) cur.correct++;
      map.set(key, cur);
    }
  }
  return [...map].map(([key, v]) => ({ key, correct: v.correct, total: v.total, rate: v.correct / v.total }));
}

/** Yếu nhất trước; hoà thì theo tên để thứ tự ổn định. */
function weakestFirst(a: RateItem, b: RateItem) {
  return a.rate - b.rate || a.key.localeCompare(b.key);
}

export function computeWeakness(rows: AnswerRow[]): Weakness {
  const answered = rows.filter((r) => r.isCorrect !== null);
  const bySection = tally(answered, (r) => [r.section]).sort(weakestFirst);
  const byTag = tally(answered, (r) => r.skillTags)
    .filter((t) => t.total >= MIN_TAG_ANSWERS)
    .sort(weakestFirst);
  return { bySection, byTag };
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Chạy: `npm test -- src/features/stats/weakness.test.ts`

Kỳ vọng: PASS, 6 test.

- [ ] **Step 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test
npm run typecheck
npm run lint
git add src/features/stats/weakness.ts src/features/stats/weakness.test.ts
git commit -m "feat: hàm thuần tính tỉ lệ đúng theo phần thi và kỹ năng"
```

---

### Task 2: Gom dữ liệu cho dashboard

**Files:**
- Create: `src/features/stats/load-dashboard.ts`
- Test: `src/features/stats/load-dashboard.test.ts`

**Interfaces:**
- Consumes: `computeWeakness`, `AnswerRow`, `RateItem` từ Task 1; `getCertificate`, `getSection`, `ScoreResult` từ `@/features/certificates`.
- Produces:
  - `type DashboardDb = Pick<PrismaClient, "attempt" | "attemptAnswer">`
  - `type ExamPoint = { attemptId: string; submittedAt: string; total: number }`
  - `type SectionRate = RateItem & { name: string }`
  - `type Suggestion = { tag: string; section: string; sectionName: string; correct: number; total: number; rate: number }`
  - `type Dashboard = { certificate: string; latest: { attemptId: string; submittedAt: string; scores: ScoreResult } | null; history: ExamPoint[]; bySection: SectionRate[]; byTag: RateItem[]; suggestions: Suggestion[]; answered: number }`
  - `const WINDOW_DAYS = 30`, `const HISTORY_LIMIT = 5`, `const SUGGESTION_LIMIT = 3`
  - `function loadDashboard(db: DashboardDb, p: { userId: string; certificate: string; now?: Date }): Promise<Dashboard>`

**Yêu cầu:**
- **Chỉ tính lượt đã nộp.** Truy vấn câu trả lời phải lọc `attempt.submittedAt` trong 30 ngày gần nhất, nếu không bài thi đang làm dở (mọi `isCorrect` đều `null`) sẽ làm bẩn thống kê.
- Chỉ lấy câu người dùng đã chọn đáp án (`chosen: { not: null }`).
- `history` sắp **từ cũ đến mới** để vẽ đường tiến bộ; `latest` là lượt mới nhất (phần tử cuối của `history`, nhưng lấy trực tiếp từ danh sách đã sắp giảm dần cho rõ ràng).
- Lượt thi thiếu `scores` hoặc `scores.total` không phải số thì bỏ qua, không làm hỏng cả trang.
- Tên phần thi lấy từ `getSection(cert, id)?.name`, thiếu thì dùng luôn id.
- Mỗi gợi ý cần biết mở drill ở phần nào: chọn phần thi mà tag đó xuất hiện nhiều nhất; hoà thì theo tên phần thi để ổn định.
- `now` là tham số tuỳ chọn để test cố định được mốc thời gian.
- Không dùng `$transaction`.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/features/stats/load-dashboard.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { loadDashboard, type DashboardDb } from "./load-dashboard";

const NOW = new Date("2026-09-05T10:00:00Z");

const exam = (id: string, day: string, total: number, listening = 300, reading = 200) => ({
  id,
  submittedAt: new Date(day),
  scores: { parts: { listening, reading }, total },
});

/** Một dòng AttemptAnswer đúng dạng select trong loadDashboard. */
const ans = (section: string, skillTags: string[], isCorrect: boolean | null) => ({
  isCorrect,
  question: { section, skillTags },
});

function fakeDb(exams: unknown[], answers: unknown[]) {
  return {
    attempt: { findMany: vi.fn(async () => exams) },
    attemptAnswer: { findMany: vi.fn(async () => answers) },
  } as unknown as DashboardDb;
}

describe("loadDashboard", () => {
  it("trả điểm lượt gần nhất và đường tiến bộ từ cũ đến mới", async () => {
    const db = fakeDb(
      [exam("a3", "2026-09-04T00:00:00Z", 700), exam("a2", "2026-09-02T00:00:00Z", 600), exam("a1", "2026-09-01T00:00:00Z", 500)],
      [],
    );
    const d = await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.latest).toEqual({ attemptId: "a3", submittedAt: "2026-09-04T00:00:00.000Z", scores: { parts: { listening: 300, reading: 200 }, total: 700 } });
    expect(d.history.map((h) => h.total)).toEqual([500, 600, 700]);
  });

  it("chưa thi lần nào thì latest là null và history rỗng", async () => {
    const d = await loadDashboard(fakeDb([], []), { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.latest).toBeNull();
    expect(d.history).toEqual([]);
    expect(d.answered).toBe(0);
  });

  it("bỏ qua lượt thi thiếu scores", async () => {
    const db = fakeDb([{ id: "a2", submittedAt: new Date("2026-09-04T00:00:00Z"), scores: null }, exam("a1", "2026-09-01T00:00:00Z", 500)], []);
    const d = await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.latest?.attemptId).toBe("a1");
    expect(d.history).toHaveLength(1);
  });

  it("gắn tên phần thi và đếm số câu đã trả lời", async () => {
    const answers = [
      ans("toeic.p5", ["ngữ pháp"], true),
      ans("toeic.p5", ["ngữ pháp"], false),
      ans("toeic.p7", ["suy luận"], null),
    ];
    const d = await loadDashboard(fakeDb([], answers), { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.bySection).toEqual([{ key: "toeic.p5", name: "Part 5 – Hoàn thành câu", correct: 1, total: 2, rate: 0.5 }]);
    expect(d.answered).toBe(2);
  });

  it("gợi ý ba kỹ năng yếu nhất, kèm phần thi hay gặp nhất của kỹ năng đó", async () => {
    const answers = [
      // "suy luận": 5 câu ở p7, đúng 1 → 20%
      ...Array.from({ length: 5 }, (_, i) => ans("toeic.p7", ["suy luận"], i < 1)),
      // "ngữ pháp": 5 câu ở p5, đúng 4 → 80%
      ...Array.from({ length: 5 }, (_, i) => ans("toeic.p5", ["ngữ pháp"], i < 4)),
      // "từ vựng": chỉ 2 câu → dưới ngưỡng, không được gợi ý
      ans("toeic.p5", ["từ vựng"], false),
      ans("toeic.p5", ["từ vựng"], false),
    ];
    const d = await loadDashboard(fakeDb([], answers), { userId: "u1", certificate: "toeic", now: NOW });
    expect(d.suggestions).toHaveLength(2);
    expect(d.suggestions[0]).toEqual({ tag: "suy luận", section: "toeic.p7", sectionName: "Part 7 – Đọc hiểu", correct: 1, total: 5, rate: 0.2 });
    expect(d.suggestions[1].tag).toBe("ngữ pháp");
  });

  it("chỉ lấy câu của lượt đã nộp trong 30 ngày, và chỉ câu đã chọn đáp án", async () => {
    const db = fakeDb([], []);
    await loadDashboard(db, { userId: "u1", certificate: "toeic", now: NOW });
    const where = (db.attemptAnswer.findMany as unknown as { mock: { calls: [{ where: Record<string, unknown> }][] } }).mock.calls[0][0].where;
    expect(where).toMatchObject({
      chosen: { not: null },
      attempt: { userId: "u1", certificate: "toeic", submittedAt: { gte: new Date("2026-08-06T10:00:00Z") } },
    });
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Chạy: `npm test -- src/features/stats/load-dashboard.test.ts`

Kỳ vọng: FAIL, không tìm thấy module `./load-dashboard`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/features/stats/load-dashboard.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { getCertificate, getSection, type ScoreResult } from "@/features/certificates";
import { computeWeakness, type AnswerRow, type RateItem } from "./weakness";

export type DashboardDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

/** Cửa sổ thời gian của bản đồ điểm yếu (spec mục 4.1). */
export const WINDOW_DAYS = 30;
/** Số lượt thi gần nhất vẽ lên đường tiến bộ. */
export const HISTORY_LIMIT = 5;
/** Số gợi ý luyện tập hiển thị. */
export const SUGGESTION_LIMIT = 3;

export type ExamPoint = { attemptId: string; submittedAt: string; total: number };
export type SectionRate = RateItem & { name: string };
export type Suggestion = { tag: string; section: string; sectionName: string; correct: number; total: number; rate: number };

export type Dashboard = {
  certificate: string;
  latest: { attemptId: string; submittedAt: string; scores: ScoreResult } | null;
  history: ExamPoint[];
  bySection: SectionRate[];
  byTag: RateItem[];
  suggestions: Suggestion[];
  answered: number;
};

export async function loadDashboard(db: DashboardDb, p: { userId: string; certificate: string; now?: Date }): Promise<Dashboard> {
  const cert = getCertificate(p.certificate);
  const now = p.now ?? new Date();
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Các lượt thi thử đã nộp, mới nhất trước
  const exams = await db.attempt.findMany({
    where: { userId: p.userId, certificate: cert.id, type: "EXAM", submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, submittedAt: true, scores: true },
  });

  const scored: { attemptId: string; submittedAt: string; scores: ScoreResult }[] = [];
  for (const e of exams) {
    const s = e.scores as ScoreResult | null;
    if (!e.submittedAt || !s || typeof s.total !== "number") continue;
    scored.push({ attemptId: e.id, submittedAt: e.submittedAt.toISOString(), scores: s });
  }
  const latest = scored[0] ?? null;
  // Đường tiến bộ đọc từ trái sang phải nên đảo lại thành cũ → mới
  const history: ExamPoint[] = [...scored].reverse().map((r) => ({ attemptId: r.attemptId, submittedAt: r.submittedAt, total: r.scores.total }));

  // Câu đã trả lời trong các lượt đã nộp gần đây (cả thi thử lẫn luyện tập)
  const rows = await db.attemptAnswer.findMany({
    where: {
      chosen: { not: null },
      attempt: { userId: p.userId, certificate: cert.id, submittedAt: { gte: since } },
    },
    select: { isCorrect: true, question: { select: { section: true, skillTags: true } } },
  });

  const answers: AnswerRow[] = rows.map((r) => ({ section: r.question.section, skillTags: r.question.skillTags, isCorrect: r.isCorrect }));
  const { bySection, byTag } = computeWeakness(answers);

  const named: SectionRate[] = bySection.map((s) => ({ ...s, name: getSection(cert, s.key)?.name ?? s.key }));

  // Mỗi kỹ năng gắn với phần thi hay gặp nhất, để gợi ý mở đúng bài drill
  const seen = new Map<string, Map<string, number>>();
  for (const a of answers) {
    if (a.isCorrect === null) continue;
    for (const tag of new Set(a.skillTags)) {
      const m = seen.get(tag) ?? new Map<string, number>();
      m.set(a.section, (m.get(a.section) ?? 0) + 1);
      seen.set(tag, m);
    }
  }
  const mainSection = (tag: string) => {
    const m = seen.get(tag);
    if (!m || m.size === 0) return "";
    return [...m].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
  };

  const suggestions: Suggestion[] = byTag.slice(0, SUGGESTION_LIMIT).map((t) => {
    const section = mainSection(t.key);
    return { tag: t.key, section, sectionName: getSection(cert, section)?.name ?? section, correct: t.correct, total: t.total, rate: t.rate };
  });

  return {
    certificate: cert.id,
    latest,
    history,
    bySection: named,
    byTag,
    suggestions,
    answered: answers.filter((a) => a.isCorrect !== null).length,
  };
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Chạy: `npm test -- src/features/stats/load-dashboard.test.ts`

Kỳ vọng: PASS, 6 test.

- [ ] **Step 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test
npm run typecheck
npm run lint
git add src/features/stats/load-dashboard.ts src/features/stats/load-dashboard.test.ts
git commit -m "feat: gom dữ liệu dashboard — điểm gần nhất, tiến bộ, điểm yếu, gợi ý"
```

---
### Task 3: Thẻ điểm và đường tiến bộ

**Files:**
- Create: `src/components/dashboard/ScoreCard.tsx`
- Create: `src/components/dashboard/ProgressSparkline.tsx`
- Test: `src/components/dashboard/ScoreCard.test.tsx`
- Test: `src/components/dashboard/ProgressSparkline.test.tsx`

**Interfaces:**
- Consumes: `Dashboard`, `ExamPoint` từ `@/features/stats/load-dashboard` (Task 2).
- Produces:
  - `function ScoreCard(props: { latest: Dashboard["latest"] }): JSX.Element`
  - `function ProgressSparkline(props: { points: ExamPoint[] }): JSX.Element | null`

**Yêu cầu:**
- Cả hai là **server component thuần trình bày**: không `"use client"`, không state, không đọc `localStorage`, không gọi `Date.now()`.
- `ScoreCard` khi `latest === null`: hiện lời mời thi thử kèm link `/exam`, **không** hiện số 0.
- `ProgressSparkline` trả `null` khi có dưới 2 điểm — một điểm thì không thành đường.
- SVG phải có `role="img"` và `aria-label` mô tả được bằng lời, vì người dùng bàn phím / đọc màn hình không thấy đường vẽ.
- Định dạng ngày kiểu Việt Nam bằng `toLocaleDateString("vi-VN", ...)`.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/components/dashboard/ScoreCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreCard } from "./ScoreCard";

describe("ScoreCard", () => {
  it("chưa thi lần nào → mời thi thử, không hiện điểm", () => {
    render(<ScoreCard latest={null} />);
    expect(screen.getByRole("link", { name: "Thi thử ngay" })).toHaveAttribute("href", "/exam");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("hiện tổng điểm, điểm nghe và đọc, kèm link xem bài làm", () => {
    render(
      <ScoreCard
        latest={{ attemptId: "a1", submittedAt: "2026-09-04T00:00:00.000Z", scores: { parts: { listening: 300, reading: 250 }, total: 550 } }}
      />,
    );
    expect(screen.getByText("550")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem bài làm" })).toHaveAttribute("href", "/attempts/a1/result");
  });
});
```

Tạo `src/components/dashboard/ProgressSparkline.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressSparkline } from "./ProgressSparkline";

const p = (attemptId: string, total: number) => ({ attemptId, submittedAt: "2026-09-04T00:00:00.000Z", total });

describe("ProgressSparkline", () => {
  it("dưới 2 lượt thi thì không vẽ gì", () => {
    const { container } = render(<ProgressSparkline points={[p("a1", 500)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("vẽ đường và mô tả được bằng lời, nói rõ tăng bao nhiêu điểm", () => {
    render(<ProgressSparkline points={[p("a1", 500), p("a2", 560), p("a3", 620)]} />);
    expect(screen.getByRole("img", { name: /500/ })).toBeInTheDocument();
    expect(screen.getByText(/tăng 120 điểm/)).toBeInTheDocument();
  });

  it("mọi lượt bằng điểm nhau vẫn vẽ được, báo chưa đổi", () => {
    render(<ProgressSparkline points={[p("a1", 500), p("a2", 500)]} />);
    expect(screen.getByText(/chưa đổi/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Chạy: `npm test -- src/components/dashboard`

Kỳ vọng: FAIL, không tìm thấy `./ScoreCard` và `./ProgressSparkline`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/components/dashboard/ScoreCard.tsx`:

```tsx
import Link from "next/link";
import type { Dashboard } from "@/features/stats/load-dashboard";

type Props = { latest: Dashboard["latest"] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ScoreCard({ latest }: Props) {
  if (!latest) {
    return (
      <section className="card p-6">
        <h2 className="text-lg font-bold">Điểm ước tính</h2>
        <p className="mt-2 text-muted">Chưa có lượt thi thử nào. Làm một đề để biết mình đang ở đâu.</p>
        <Link href="/exam" className="btn-primary mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Thi thử ngay
        </Link>
      </section>
    );
  }

  const listening = latest.scores.parts.listening ?? 0;
  const reading = latest.scores.parts.reading ?? 0;
  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Điểm ước tính</h2>
        <span className="text-xs text-muted">Thi ngày {fmtDate(latest.submittedAt)}</span>
      </div>
      <p className="mt-3 text-5xl font-extrabold text-accent">{latest.scores.total}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
          <dt className="text-muted">Nghe</dt>
          <dd className="text-xl font-bold">{listening}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
          <dt className="text-muted">Đọc</dt>
          <dd className="text-xl font-bold">{reading}</dd>
        </div>
      </dl>
      <Link href={`/attempts/${latest.attemptId}/result`} className="mt-4 inline-block text-sm font-semibold text-info hover:underline">
        Xem bài làm
      </Link>
    </section>
  );
}
```

Tạo `src/components/dashboard/ProgressSparkline.tsx`:

```tsx
import type { ExamPoint } from "@/features/stats/load-dashboard";

type Props = { points: ExamPoint[] };

const W = 100;
const H = 32;

export function ProgressSparkline({ points }: Props) {
  if (points.length < 2) return null;

  const totals = points.map((p) => p.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const span = max - min || 1; // mọi lượt bằng điểm nhau thì vẽ đường ngang
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p.total - min) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = totals[0];
  const last = totals[totals.length - 1];
  const diff = last - first;
  const note = diff > 0 ? `tăng ${diff} điểm` : diff < 0 ? `giảm ${-diff} điểm` : "chưa đổi";

  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">Tiến bộ</h2>
      <p className="mt-1 text-sm text-muted">{points.length} lượt thi gần nhất · {note}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-4 h-20 w-full text-accent"
        role="img"
        aria-label={`Điểm qua ${points.length} lượt thi, từ ${first} đến ${last}`}
      >
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Chạy: `npm test -- src/components/dashboard`

Kỳ vọng: PASS, 5 test.

- [ ] **Step 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test
npm run typecheck
npm run lint
git add src/components/dashboard
git commit -m "feat: thẻ điểm ước tính và đường tiến bộ cho dashboard"
```

---

### Task 4: Thanh điểm yếu và danh sách gợi ý

**Files:**
- Create: `src/components/dashboard/WeaknessBars.tsx`
- Create: `src/components/dashboard/SuggestionList.tsx`
- Test: `src/components/dashboard/WeaknessBars.test.tsx`
- Test: `src/components/dashboard/SuggestionList.test.tsx`

**Interfaces:**
- Consumes: `Suggestion` từ `@/features/stats/load-dashboard` (Task 2).
- Produces:
  - `type BarItem = { key: string; label: string; correct: number; total: number; rate: number }`
  - `function WeaknessBars(props: { title: string; items: BarItem[]; emptyText: string }): JSX.Element`
  - `function SuggestionList(props: { suggestions: Suggestion[] }): JSX.Element`

**Yêu cầu:**
- `WeaknessBars` dùng chung cho cả "theo phần thi" và "theo kỹ năng"; nó nhận `label` sẵn nên **không** import `CertificateSpec`.
- Màu thanh theo tỉ lệ: dưới 50% `bg-danger`, từ 50% đến dưới 75% `bg-accent`, từ 75% trở lên `bg-emerald-400`.
- Thanh là hình vẽ nên phải có `role="img"` + `aria-label` ghi rõ phần trăm; nếu không, người đọc màn hình chỉ nghe được con số ở dòng trên mà không biết nó thuộc mục nào.
- Link gợi ý trỏ `/drill?section=<section>&tag=<tag>`, hai giá trị đều đi qua `encodeURIComponent` vì tag là tiếng Việt có dấu và dấu cách.
- Danh sách rỗng thì hiện `emptyText` (với `WeaknessBars`) hoặc câu giải thích cần tối thiểu 5 câu mỗi kỹ năng (với `SuggestionList`).

- [ ] **Step 1: Viết test thất bại**

Tạo `src/components/dashboard/WeaknessBars.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeaknessBars } from "./WeaknessBars";

const items = [
  { key: "toeic.p7", label: "Part 7 – Đọc hiểu", correct: 1, total: 4, rate: 0.25 },
  { key: "toeic.p5", label: "Part 5 – Hoàn thành câu", correct: 3, total: 4, rate: 0.75 },
];

describe("WeaknessBars", () => {
  it("hiện nhãn, phần trăm và số câu của từng mục", () => {
    render(<WeaknessBars title="Theo phần thi" items={items} emptyText="Chưa có dữ liệu." />);
    expect(screen.getByRole("heading", { name: "Theo phần thi" })).toBeInTheDocument();
    expect(screen.getByText("Part 7 – Đọc hiểu")).toBeInTheDocument();
    expect(screen.getByText("25% · 1/4 câu")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Part 7 – Đọc hiểu: đúng 25 phần trăm" })).toBeInTheDocument();
  });

  it("danh sách rỗng thì hiện lời nhắc", () => {
    render(<WeaknessBars title="Theo kỹ năng" items={[]} emptyText="Chưa đủ dữ liệu." />);
    expect(screen.getByText("Chưa đủ dữ liệu.")).toBeInTheDocument();
  });
});
```

Tạo `src/components/dashboard/SuggestionList.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuggestionList } from "./SuggestionList";

describe("SuggestionList", () => {
  it("mỗi gợi ý mở drill đúng phần và đúng kỹ năng, tag có dấu được mã hoá", () => {
    render(
      <SuggestionList
        suggestions={[{ tag: "suy luận", section: "toeic.p7", sectionName: "Part 7 – Đọc hiểu", correct: 1, total: 5, rate: 0.2 }]}
      />,
    );
    const link = screen.getByRole("link", { name: /suy luận/ });
    expect(link).toHaveAttribute("href", `/drill?section=toeic.p7&tag=${encodeURIComponent("suy luận")}`);
    expect(screen.getByText(/đúng 20% trong 5 câu/)).toBeInTheDocument();
  });

  it("chưa có gợi ý thì giải thích cần ít nhất 5 câu mỗi kỹ năng", () => {
    render(<SuggestionList suggestions={[]} />);
    expect(screen.getByText(/ít nhất 5 câu/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Chạy: `npm test -- src/components/dashboard`

Kỳ vọng: FAIL, không tìm thấy `./WeaknessBars` và `./SuggestionList`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/components/dashboard/WeaknessBars.tsx`:

```tsx
export type BarItem = { key: string; label: string; correct: number; total: number; rate: number };

type Props = { title: string; items: BarItem[]; emptyText: string };

function barColor(rate: number) {
  if (rate < 0.5) return "bg-danger";
  if (rate < 0.75) return "bg-accent";
  return "bg-emerald-400";
}

export function WeaknessBars({ title, items, emptyText }: Props) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-muted">{emptyText}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((it) => {
            const pct = Math.round(it.rate * 100);
            return (
              <li key={it.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{it.label}</span>
                  <span className="shrink-0 text-muted">{pct}% · {it.correct}/{it.total} câu</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${it.label}: đúng ${pct} phần trăm`}>
                  <div className={`h-full rounded-full ${barColor(it.rate)}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

Tạo `src/components/dashboard/SuggestionList.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Suggestion } from "@/features/stats/load-dashboard";

type Props = { suggestions: Suggestion[] };

export function SuggestionList({ suggestions }: Props) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">Gợi ý hôm nay</h2>
      {suggestions.length === 0 ? (
        <p className="mt-2 text-muted">Làm thêm câu hỏi để biết mình yếu chỗ nào. Mỗi kỹ năng cần ít nhất 5 câu đã làm mới được xét.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {suggestions.map((s) => (
            <li key={s.tag}>
              <Link
                href={`/drill?section=${encodeURIComponent(s.section)}&tag=${encodeURIComponent(s.tag)}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 transition hover:border-accent/60"
              >
                <span>
                  <span className="font-semibold">{s.tag}</span>
                  <span className="block text-xs text-muted">{s.sectionName} · đúng {Math.round(s.rate * 100)}% trong {s.total} câu</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-accent-text" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó pass**

Chạy: `npm test -- src/components/dashboard`

Kỳ vọng: PASS, 9 test (5 test của Task 3 cộng 4 test mới).

- [ ] **Step 5: Kiểm tra toàn bộ rồi commit**

```bash
npm test
npm run typecheck
npm run lint
git add src/components/dashboard
git commit -m "feat: thanh tỉ lệ đúng và danh sách gợi ý luyện tập"
```

---

### Task 5: Trang chủ rẽ nhánh khách / đã đăng nhập

**Files:**
- Create: `src/components/home/LandingHero.tsx`
- Create: `src/components/dashboard/DashboardView.tsx`
- Test: `src/components/dashboard/DashboardView.test.tsx`
- Modify: `src/app/page.tsx` (viết lại toàn bộ)

**Interfaces:**
- Consumes: `ScoreCard` (Task 3), `ProgressSparkline` (Task 3), `WeaknessBars` + `BarItem` (Task 4), `SuggestionList` (Task 4), `loadDashboard` + `Dashboard` (Task 2).
- Produces:
  - `function LandingHero(): JSX.Element`
  - `function DashboardView(props: { name: string; data: Dashboard }): JSX.Element`

**Yêu cầu:**
- `LandingHero` là **bản sao nguyên văn** phần giao diện khách trong `src/app/page.tsx` hiện tại (khối hero, bốn thẻ tính năng, thẻ "Thử popup dịch"), bỏ đi nhánh `name ? ... : ...` vì nó chỉ dành cho khách. Không thiết kế lại.
- `DashboardView` thuần trình bày, không gọi database, nhận sẵn `data` — nhờ vậy test được mà không cần Postgres.
- Bố cục: lời chào → hàng trên gồm `ScoreCard` và (đường tiến bộ **hoặc** thẻ lối tắt khi chưa đủ 2 lượt thi) → `SuggestionList` → hàng dưới gồm hai `WeaknessBars`.
- Người mới (`answered === 0`) vẫn thấy đủ các thẻ ở trạng thái rỗng, không thấy biểu đồ trống rỗng vô nghĩa.
- `src/app/page.tsx` giữ nguyên là server component `async`, không thêm `"use client"`.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/components/dashboard/DashboardView.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import type { Dashboard } from "@/features/stats/load-dashboard";

const empty: Dashboard = {
  certificate: "toeic",
  latest: null,
  history: [],
  bySection: [],
  byTag: [],
  suggestions: [],
  answered: 0,
};

const full: Dashboard = {
  certificate: "toeic",
  latest: { attemptId: "a2", submittedAt: "2026-09-04T00:00:00.000Z", scores: { parts: { listening: 300, reading: 250 }, total: 550 } },
  history: [
    { attemptId: "a1", submittedAt: "2026-09-01T00:00:00.000Z", total: 500 },
    { attemptId: "a2", submittedAt: "2026-09-04T00:00:00.000Z", total: 550 },
  ],
  bySection: [{ key: "toeic.p7", name: "Part 7 – Đọc hiểu", correct: 1, total: 4, rate: 0.25 }],
  byTag: [{ key: "suy luận", correct: 1, total: 5, rate: 0.2 }],
  suggestions: [{ tag: "suy luận", section: "toeic.p7", sectionName: "Part 7 – Đọc hiểu", correct: 1, total: 5, rate: 0.2 }],
  answered: 9,
};

describe("DashboardView", () => {
  it("người mới: chào tên, mời làm bài, không có biểu đồ tiến bộ", () => {
    render(<DashboardView name="Thắng" data={empty} />);
    expect(screen.getByRole("heading", { level: 1, name: /Thắng/ })).toBeInTheDocument();
    expect(screen.getByText(/chưa làm câu nào/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tiến bộ" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thi thử ngay" })).toBeInTheDocument();
  });

  it("có dữ liệu: hiện điểm, tiến bộ, gợi ý và cả hai bảng điểm yếu", () => {
    render(<DashboardView name="Thắng" data={full} />);
    // 550 xuất hiện cả ở thẻ điểm lẫn ở đầu mút đường tiến bộ nên phải dùng getAllByText
    expect(screen.getByRole("heading", { name: "Điểm ước tính" })).toBeInTheDocument();
    expect(screen.getAllByText("550").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Tiến bộ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Theo phần thi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Theo kỹ năng" })).toBeInTheDocument();
    expect(screen.getByText(/đã làm 9 câu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /suy luận/ })).toHaveAttribute("href", `/drill?section=toeic.p7&tag=${encodeURIComponent("suy luận")}`);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Chạy: `npm test -- src/components/dashboard/DashboardView.test.tsx`

Kỳ vọng: FAIL, không tìm thấy `./DashboardView`.

- [ ] **Step 3: Tách phần giới thiệu ra `LandingHero`**

Tạo `src/components/home/LandingHero.tsx` với đúng nội dung dưới đây (chuyển nguyên từ `src/app/page.tsx`, bỏ nhánh chào theo tên):

```tsx
import Link from "next/link";
import { Target, Zap, BrainCircuit, BookOpen, ArrowRight, Search } from "lucide-react";

const FEATURES = [
  { href: "/exam", Icon: Target, title: "Thi thử", desc: "Đề TOEIC Listening & Reading đầy đủ, có đồng hồ và chấm điểm." },
  { href: "/drill", Icon: Zap, title: "Luyện tập", desc: "Luyện theo từng Part, xem giải thích ngay sau mỗi câu." },
  { href: "/vocab", Icon: BrainCircuit, title: "Từ vựng", desc: "Ôn từ đã lưu theo lịch, trắc nghiệm Anh–Việt và Việt–Anh." },
  { href: "/reading", Icon: BookOpen, title: "Đọc song ngữ", desc: "Truyện hài, cổ tích, anime, báo. Tiếng Anh và tiếng Việt cạnh nhau." },
];

export function LandingHero() {
  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-2xl border border-line bg-surface px-6 py-10 backdrop-blur-md md:px-10 md:py-16">
        <div className="max-w-3xl">
          <span className="inline-block rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
            Miễn phí · Không quảng cáo
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            Cày TOEIC <span className="text-accent">không nhàm chán</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Thi thử, luyện tập theo Part, ôn từ vựng và đọc song ngữ. Bôi đen bất kỳ từ tiếng Anh nào để xem nghĩa ngay tại chỗ.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold">
              Bắt đầu ngay
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/login" className="rounded-lg border border-line px-6 py-3 font-medium text-foreground hover:bg-surface-2">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ href, Icon, title, desc }) => (
          <Link key={href} href={href} className="card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-text">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-lg font-bold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted">{desc}</p>
          </Link>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Search size={18} className="text-accent-text" aria-hidden="true" />
          Thử popup dịch
        </h2>
        <p className="mt-2 leading-relaxed text-foreground/90">
          Bôi đen một từ hoặc một cụm trong câu sau: The committee will postpone the meeting until further notice. Bạn cũng có thể bôi đen tiếng Việt để dịch sang tiếng Anh.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Viết `DashboardView`**

Tạo `src/components/dashboard/DashboardView.tsx`:

```tsx
import Link from "next/link";
import type { Dashboard } from "@/features/stats/load-dashboard";
import { ScoreCard } from "./ScoreCard";
import { ProgressSparkline } from "./ProgressSparkline";
import { WeaknessBars } from "./WeaknessBars";
import { SuggestionList } from "./SuggestionList";

type Props = { name: string; data: Dashboard };

/** Thẻ thay chỗ đường tiến bộ khi chưa đủ hai lượt thi để vẽ. */
function QuickActions() {
  return (
    <section className="card flex flex-col p-6">
      <h2 className="text-lg font-bold">Bắt đầu từ đâu</h2>
      <p className="mt-2 text-muted">Thi thử một đề để có điểm ước tính, hoặc luyện từng Part để làm quen dạng câu hỏi.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/exam" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">Thi thử</Link>
        <Link href="/drill" className="rounded-lg border border-line px-5 py-2 text-sm font-medium hover:bg-surface-2">Luyện tập</Link>
      </div>
    </section>
  );
}

export function DashboardView({ name, data }: Props) {
  const sectionItems = data.bySection.map((s) => ({ key: s.key, label: s.name, correct: s.correct, total: s.total, rate: s.rate }));
  const tagItems = data.byTag.map((t) => ({ key: t.key, label: t.key, correct: t.correct, total: t.total, rate: t.rate }));

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2">
        <h1 className="text-3xl font-extrabold">
          Chào <span className="text-accent">{name}</span>
        </h1>
        <p className="mt-1 text-muted">
          {data.answered === 0
            ? "Bạn chưa làm câu nào. Bắt đầu bằng một lượt luyện tập nhé."
            : `Bạn đã làm ${data.answered} câu trong 30 ngày qua.`}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreCard latest={data.latest} />
        {data.history.length >= 2 ? <ProgressSparkline points={data.history} /> : <QuickActions />}
      </div>

      <SuggestionList suggestions={data.suggestions} />

      <div className="grid gap-4 md:grid-cols-2">
        <WeaknessBars title="Theo phần thi" items={sectionItems} emptyText="Chưa có câu nào trong 30 ngày qua." />
        <WeaknessBars title="Theo kỹ năng" items={tagItems} emptyText="Mỗi kỹ năng cần ít nhất 5 câu đã làm mới được thống kê." />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Viết lại `src/app/page.tsx`**

Thay toàn bộ nội dung file bằng:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadDashboard } from "@/features/stats/load-dashboard";
import { LandingHero } from "@/components/home/LandingHero";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <LandingHero />;

  const data = await loadDashboard(prisma, { userId, certificate: "toeic" });
  const name = session.user?.name || session.user?.email || "bạn";
  return <DashboardView name={name} data={data} />;
}
```

- [ ] **Step 6: Chạy test để chắc chắn nó pass**

Chạy: `npm test -- src/components/dashboard/DashboardView.test.tsx`

Kỳ vọng: PASS, 2 test.

- [ ] **Step 7: Kiểm tra toàn bộ rồi commit**

```bash
npm test
npm run typecheck
npm run lint
npm run build
git add src/app/page.tsx src/components/home src/components/dashboard
git commit -m "feat: trang chủ hiện dashboard khi đã đăng nhập, tách LandingHero cho khách"
```

---

### Task 6: Gợi ý mở thẳng bài luyện tập

**Files:**
- Modify: `src/components/drill/DrillSetupForm.tsx`
- Modify: `src/app/drill/page.tsx`
- Test: `src/components/drill/DrillSetupForm.test.tsx` (thêm test, giữ nguyên hai test cũ)

**Interfaces:**
- Consumes: link dạng `/drill?section=<section>&tag=<tag>` do `SuggestionList` (Task 4) sinh ra.
- Produces: `DrillSetupForm` nhận thêm hai prop tuỳ chọn `defaultSection?: string` và `defaultTag?: string`.

**Yêu cầu:**
- `defaultSection` chỉ được dùng khi nó nằm trong danh sách `sections`; giá trị lạ trên URL phải rơi về phần đầu tiên, không được làm form kẹt ở trạng thái không hợp lệ.
- Khi có `defaultTag`, form hiện một chip cho biết đang lọc kỹ năng nào, kèm nút bỏ lọc; body gửi lên có thêm `skillTags: [tag]`. Không có tag thì body giữ nguyên đúng hai trường `{ section, count }` như hiện nay (test cũ kiểm tra điều này).
- Bỏ lọc rồi thì lần bấm sau không gửi `skillTags` nữa.
- `/drill` là server component; Next 15 truyền `searchParams` dưới dạng Promise nên phải `await`.
- Giữ nguyên mọi hành vi cũ: chọn phần, chọn số câu, thông báo `NOT_ENOUGH_QUESTIONS`.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `describe("DrillSetupForm", ...)` trong `src/components/drill/DrillSetupForm.test.tsx`:

```tsx
  it("có defaultSection và defaultTag → chọn sẵn phần đó và gửi kèm kỹ năng", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ attemptId: "a9", count: 10 }), { status: 200 }));
    render(<DrillSetupForm sections={sections} defaultSection="toeic.p7" defaultTag="suy luận" />);
    expect(screen.getByRole("radio", { name: /Part 7/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/drill/a9"));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ section: "toeic.p7", count: 10, skillTags: ["suy luận"] });
  });

  it("bỏ lọc kỹ năng thì không gửi skillTags nữa", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ attemptId: "a9", count: 10 }), { status: 200 }));
    render(<DrillSetupForm sections={sections} defaultSection="toeic.p7" defaultTag="suy luận" />);
    await userEvent.click(screen.getByRole("button", { name: "Bỏ lọc kỹ năng" }));
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ section: "toeic.p7", count: 10 });
  });

  it("defaultSection không có trong danh sách thì rơi về phần đầu tiên", () => {
    render(<DrillSetupForm sections={sections} defaultSection="toeic.p99" />);
    expect(screen.getByRole("radio", { name: /Part 5/ })).toHaveAttribute("aria-checked", "true");
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Chạy: `npm test -- src/components/drill/DrillSetupForm.test.tsx`

Kỳ vọng: FAIL — TypeScript báo prop lạ, và không tìm thấy nút "Bỏ lọc kỹ năng".

- [ ] **Step 3: Sửa `DrillSetupForm`**

Trong `src/components/drill/DrillSetupForm.tsx`:

Đổi khai báo props và state khởi tạo:

```tsx
type Props = { sections: { id: string; name: string }[]; defaultSection?: string; defaultTag?: string };
const COUNTS = [10, 20, 30] as const;

export function DrillSetupForm({ sections, defaultSection, defaultTag }: Props) {
  const router = useRouter();
  // Tham số trên URL có thể sai; chỉ nhận khi phần đó thật sự tồn tại
  const known = defaultSection && sections.some((s) => s.id === defaultSection) ? defaultSection : null;
  const [section, setSection] = useState(known ?? sections[0]?.id ?? "");
  const [tag, setTag] = useState<string | null>(defaultTag ?? null);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
```

Trong `start()`, đổi phần dựng body:

```tsx
      const body = tag ? { section, count, skillTags: [tag] } : { section, count };
      const res = await fetch("/api/drill/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
```

Thêm chip lọc ngay trước dòng `{error && ...}`:

```tsx
      {tag && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          <span>Lọc theo kỹ năng: <span className="font-semibold">{tag}</span></span>
          <button type="button" onClick={() => setTag(null)} className="ml-auto text-xs font-semibold text-info hover:underline">
            Bỏ lọc kỹ năng
          </button>
        </div>
      )}
```

- [ ] **Step 4: Cho `/drill` đọc tham số URL**

Trong `src/app/drill/page.tsx`, đổi chữ ký hàm và lời gọi form:

```tsx
export default async function DrillPage({ searchParams }: { searchParams: Promise<{ section?: string; tag?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <Zap size={26} className="text-accent-text" aria-hidden="true" />
          Luyện tập theo Part
        </h1>
        <p className="mt-2 text-muted">Chọn phần và số câu. Sau mỗi câu bạn thấy ngay đáp án và giải thích. Câu chưa làm và câu làm sai được ưu tiên.</p>
      </header>
      <DrillSetupForm
        sections={TOEIC.sections.map((s) => ({ id: s.id, name: s.name }))}
        defaultSection={sp.section}
        defaultTag={sp.tag}
      />
    </div>
  );
}
```

- [ ] **Step 5: Chạy test để chắc chắn nó pass**

Chạy: `npm test -- src/components/drill/DrillSetupForm.test.tsx`

Kỳ vọng: PASS, 5 test (2 cũ + 3 mới).

- [ ] **Step 6: Kiểm tra toàn bộ rồi commit**

```bash
npm test
npm run typecheck
npm run lint
npm run build
git add src/components/drill/DrillSetupForm.tsx src/components/drill/DrillSetupForm.test.tsx src/app/drill/page.tsx
git commit -m "feat: gợi ý trên dashboard mở thẳng bài luyện tập đúng phần và kỹ năng"
```

---

## Kiểm tra tay sau khi xong

Cần Docker Desktop đang chạy và `npm run dev`:

1. Chưa đăng nhập, vào `/` — thấy trang giới thiệu như cũ.
2. Đăng nhập bằng tài khoản chưa làm bài nào, vào `/` — thấy lời chào, thẻ "Điểm ước tính" trạng thái rỗng có nút "Thi thử ngay", thẻ "Bắt đầu từ đâu", và hai bảng điểm yếu đều báo chưa đủ dữ liệu. Không có biểu đồ trống.
3. Làm xong một lượt luyện tập rồi quay lại `/` — bảng "Theo phần thi" có số liệu, dòng đầu ghi số câu đã làm trong 30 ngày.
4. Nộp một đề thi thử rồi quay lại `/` — thẻ điểm hiện tổng, Nghe, Đọc, và link "Xem bài làm" mở đúng trang kết quả.
5. Khi có kỹ năng đủ 5 câu, bấm một gợi ý — sang `/drill` với phần đã chọn sẵn và chip "Lọc theo kỹ năng"; bấm "Bắt đầu luyện" thì bài chỉ gồm câu có kỹ năng đó.
