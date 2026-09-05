# Kế hoạch 2: Ngân hàng câu hỏi, luyện tập (drill), thi thử và chấm điểm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đăng nhập có thể luyện tập theo từng Part TOEIC (xem đúng/sai và giải thích ngay) và làm đề thi thử có đồng hồ, nộp bài, xem điểm ước tính và giải thích từng câu. Dữ liệu câu hỏi nhập từ file JSON bằng script.

**Architecture:** Quy tắc chứng chỉ (danh sách phần thi, số câu, thời gian, quy đổi điểm) là object `CertificateSpec` thuần TypeScript trong `src/features/certificates/`. Bảng `Question`, `QuestionGroup`, `Exam`, `Attempt`, `AttemptAnswer` gắn mã `certificate` và `section` dạng chuỗi (`"toeic.p5"`). Mỗi lượt làm bài (drill hoặc thi) là một `Attempt` với các dòng `AttemptAnswer` tạo sẵn lúc bắt đầu; nghiệp vụ trong `src/features/attempts/` nhận `db` qua tham số. Route handler mỏng, giao diện là client component nhận dữ liệu từ server component.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind 4 (phong cách nền tối neon đã có: class `.card`, `.btn-neon`, `.text-neon`, `.glow`; token `text-muted`, `border-line`, `bg-surface`, `bg-surface-2`, `text-neon-violet`, `text-neon-pink`, `text-neon-cyan`), Prisma 6, zod 4, Vitest + Testing Library, `tsx` cho script.

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 3.1, 3 "Ngân hàng câu hỏi", 3 "Lượt làm bài", 4.2, 4.3, 6, 7, 9 bước 3)

## Global Constraints

- Node 22, npm. Toàn bộ chữ trong giao diện, thông báo lỗi, tên test, comment, commit message bằng tiếng Việt.
- Nghiệp vụ trong `src/features/*` **luôn nhận `db` qua tham số**, gõ kiểu hẹp `Pick<PrismaClient, ...>`; unit test dùng fake object (`as unknown as Db`), không cần Postgres. Không dùng `$transaction` trong nghiệp vụ mới (để fake đơn giản).
- Route handler: `zod` parse body → `auth()` → gọi hàm features với `prisma` thật → map mã lỗi sang status qua `errorToResponse` (Task 7). Mã lỗi ném bằng `Error("MÃ")`: `UNAUTHORIZED` 401, `NOT_FOUND` 404, `FORBIDDEN` 403, `ALREADY_SUBMITTED` 409, `NOT_ENOUGH_QUESTIONS` 409, `INVALID` 400, `WRONG_TYPE` 400.
- Mã chứng chỉ phiên bản này cố định `"toeic"`; section dạng `"toeic.p1"` … `"toeic.p7"`. Không dùng số Part thuần trong database.
- Không gửi `answer` và `explanation` của câu hỏi xuống client trước khi người dùng trả lời (drill) hoặc nộp bài (thi).
- Vùng làm bài thi có `data-no-translate` để popup dịch không hoạt động (chống gian lận). Drill thì cho phép dịch.
- Thời gian thi TOEIC: listening 45 phút, reading 75 phút; server chấp nhận nộp muộn tối đa 2 phút, quá thì vẫn chấm nhưng `overtime = true`.
- Test route handler cần `// @vitest-environment node` ở dòng đầu và `vi.mock` các module `@/lib/*`.
- Trang cần đăng nhập: server component gọi `auth()`, không có session thì `redirect("/login")`.
- Commit sau mỗi task, prefix `feat:`, `test:`, `chore:`, `docs:`.
- Không thêm thư viện UI mới.

---

## Cấu trúc file của kế hoạch này

```
prisma/schema.prisma                                   # thêm 5 model + 3 enum
prisma/migrations/<timestamp>_question_bank/           # prisma migrate dev
prisma/seed/import-questions.ts                        # npm run db:import-questions -- file.json [--exam "Tên đề"] [--draft]
prisma/seed/fixtures/questions-sample.json             # 12 câu mẫu p5/p6/p7 + đề rút gọn
src/features/certificates/types.ts                     # CertificateSpec, SectionSpec, ScoreResult
src/features/certificates/toeic.ts                     # spec TOEIC + bảng quy đổi điểm
src/features/certificates/index.ts                     # getCertificate(id), getSection(), CERTIFICATES
src/features/questions/import-schema.ts                # zod cho file JSON
src/features/questions/import-questions.ts             # importQuestions(db, data, opts)
src/features/questions/dto.ts                          # QuestionForClient, toClientQuestion()
src/features/drill/weighted-sample.ts                  # weightedSample(items, weightOf, count, rand)
src/features/drill/pick-questions.ts                   # pickDrillQuestions(db, params)
src/features/attempts/start-drill.ts                   # startDrill(db, params)
src/features/attempts/start-exam.ts                    # startExam(db, params)
src/features/attempts/get-attempt.ts                   # getAttemptForUser(db, params)
src/features/attempts/answer-drill.ts                  # answerDrillQuestion(db, params)
src/features/attempts/save-exam-answers.ts             # saveExamAnswers(db, params)
src/features/attempts/submit.ts                        # submitAttempt(db, params)
src/features/attempts/get-result.ts                    # getAttemptResult(db, params)
src/lib/api-errors.ts                                  # errorToResponse(e)
src/app/api/drill/start/route.ts                       # POST
src/app/api/exam/[examId]/start/route.ts               # POST
src/app/api/attempts/[attemptId]/answer/route.ts       # POST (drill)
src/app/api/attempts/[attemptId]/answers/route.ts      # PUT (thi, đồng bộ hàng loạt)
src/app/api/attempts/[attemptId]/submit/route.ts       # POST
src/app/drill/page.tsx                                 # thay ComingSoon: form chọn Part/số câu
src/app/drill/[attemptId]/page.tsx                     # server: nạp attempt → DrillRunner
src/app/exam/page.tsx                                  # thay ComingSoon: danh sách đề
src/app/exam/[examId]/page.tsx                         # giới thiệu đề + nút bắt đầu
src/app/exam/attempt/[attemptId]/page.tsx              # server: nạp attempt → ExamRunner
src/app/attempts/[attemptId]/result/page.tsx           # kết quả (dùng chung thi thử và drill)
src/components/questions/QuestionCard.tsx              # một câu: ảnh, audio, đoạn văn, stem, lựa chọn
src/components/questions/AudioOnce.tsx                 # phát audio một lần, không tua
src/components/drill/DrillSetupForm.tsx
src/components/drill/DrillRunner.tsx
src/components/exam/ExamStartButton.tsx
src/components/exam/ExamRunner.tsx
src/components/exam/ExamTimer.tsx
src/components/exam/ResultView.tsx
```

---

### Task 1: CertificateSpec cho TOEIC và bảng quy đổi điểm

**Files:**
- Create: `src/features/certificates/types.ts`
- Create: `src/features/certificates/toeic.ts`
- Create: `src/features/certificates/index.ts`
- Test: `src/features/certificates/toeic.test.ts`

**Interfaces:**
- Produces:
  - `type Skill = "listening" | "reading"`
  - `type SectionSpec = { id: string; name: string; skill: Skill; questionCount: number; hasAudio: boolean; hasImage: boolean; choiceCount: 3 | 4 }`
  - `type ScoreResult = { parts: Record<string, number>; total: number }`
  - `type CertificateSpec = { id: string; name: string; sections: SectionSpec[]; timeLimits: Record<Skill, number>; score(correctBySection: Record<string, number>): ScoreResult }`
  - `TOEIC: CertificateSpec`; `getCertificate(id: string): CertificateSpec` (ném `Error("UNKNOWN_CERTIFICATE")`); `CERTIFICATES: CertificateSpec[]`; `getSection(cert: CertificateSpec, sectionId: string): SectionSpec | undefined`

- [ ] **Step 1: Viết test**

```ts
// src/features/certificates/toeic.test.ts
import { describe, it, expect } from "vitest";
import { TOEIC } from "./toeic";
import { getCertificate, getSection } from "./index";

describe("TOEIC spec", () => {
  it("có 7 phần, tổng 200 câu, id dạng toeic.pN", () => {
    expect(TOEIC.sections).toHaveLength(7);
    expect(TOEIC.sections.map((s) => s.id)).toEqual(["toeic.p1", "toeic.p2", "toeic.p3", "toeic.p4", "toeic.p5", "toeic.p6", "toeic.p7"]);
    expect(TOEIC.sections.reduce((n, s) => n + s.questionCount, 0)).toBe(200);
  });

  it("p1–p4 là listening có audio, p5–p7 là reading không audio", () => {
    expect(TOEIC.sections.filter((s) => s.skill === "listening").every((s) => s.hasAudio)).toBe(true);
    expect(TOEIC.sections.filter((s) => s.skill === "reading").every((s) => !s.hasAudio)).toBe(true);
    expect(getSection(TOEIC, "toeic.p2")?.choiceCount).toBe(3);
    expect(getSection(TOEIC, "toeic.p1")?.hasImage).toBe(true);
  });

  it("thời gian listening 45 phút, reading 75 phút", () => {
    expect(TOEIC.timeLimits).toEqual({ listening: 45, reading: 75 });
  });

  it("0 câu đúng → 5 + 5 = 10; 100/100 → 495 + 495 = 990", () => {
    expect(TOEIC.score({})).toEqual({ parts: { listening: 5, reading: 5 }, total: 10 });
    const full = { "toeic.p1": 6, "toeic.p2": 25, "toeic.p3": 39, "toeic.p4": 30, "toeic.p5": 30, "toeic.p6": 16, "toeic.p7": 54 };
    expect(TOEIC.score(full)).toEqual({ parts: { listening: 495, reading: 495 }, total: 990 });
  });

  it("cộng số câu đúng theo kỹ năng rồi tra bảng; điểm tăng đơn điệu", () => {
    const a = TOEIC.score({ "toeic.p5": 20, "toeic.p6": 10 }); // 30 câu reading
    const b = TOEIC.score({ "toeic.p5": 25, "toeic.p6": 10 }); // 35 câu reading
    expect(a.parts.reading).toBe(130);
    expect(b.parts.reading).toBeGreaterThan(a.parts.reading);
    expect(a.parts.listening).toBe(5);
  });

  it("getCertificate trả TOEIC, mã lạ thì ném UNKNOWN_CERTIFICATE", () => {
    expect(getCertificate("toeic")).toBe(TOEIC);
    expect(() => getCertificate("ielts")).toThrow("UNKNOWN_CERTIFICATE");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/features/certificates/toeic.test.ts`
Expected: FAIL, "Failed to resolve import ./toeic".

- [ ] **Step 3: Viết types, spec TOEIC, index**

```ts
// src/features/certificates/types.ts
export type Skill = "listening" | "reading";

export type SectionSpec = {
  id: string; // "toeic.p5"
  name: string; // "Part 5 – Hoàn thành câu"
  skill: Skill;
  questionCount: number;
  hasAudio: boolean;
  hasImage: boolean;
  choiceCount: 3 | 4;
};

export type ScoreResult = { parts: Record<string, number>; total: number };

export type CertificateSpec = {
  id: string;
  name: string;
  sections: SectionSpec[];
  /** Phút cho mỗi kỹ năng. */
  timeLimits: Record<Skill, number>;
  /** Nhận số câu đúng theo section id, trả điểm theo kỹ năng và tổng. */
  score(correctBySection: Record<string, number>): ScoreResult;
};
```

```ts
// src/features/certificates/toeic.ts
import type { CertificateSpec, SectionSpec } from "./types";

// Bảng ước lượng quy đổi số câu đúng (0–100) sang điểm 5–495. Chỉ số mảng = số câu đúng. 101 phần tử mỗi bảng.
const LISTENING = [
  5, 5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 115, 120, 125,
  130, 135, 140, 145, 150, 160, 165, 170, 175, 180, 185, 190, 195, 200, 210, 215, 220, 230, 240, 245, 250, 255, 260, 270,
  275, 280, 290, 295, 300, 310, 315, 320, 325, 330, 340, 345, 350, 360, 365, 370, 380, 385, 390, 395, 400, 405, 410, 420,
  425, 430, 440, 445, 450, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495, 495,
];
const READING = [
  5, 5, 5, 5, 5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125,
  130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245,
  250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 320, 325, 330, 335, 340, 350, 355, 360, 365, 370, 380,
  385, 390, 395, 400, 405, 415, 420, 425, 430, 435, 445, 450, 455, 460, 465, 470, 475, 480, 485, 490, 495, 495, 495,
];

const sections: SectionSpec[] = [
  { id: "toeic.p1", name: "Part 1 – Mô tả tranh", skill: "listening", questionCount: 6, hasAudio: true, hasImage: true, choiceCount: 4 },
  { id: "toeic.p2", name: "Part 2 – Hỏi đáp", skill: "listening", questionCount: 25, hasAudio: true, hasImage: false, choiceCount: 3 },
  { id: "toeic.p3", name: "Part 3 – Hội thoại ngắn", skill: "listening", questionCount: 39, hasAudio: true, hasImage: false, choiceCount: 4 },
  { id: "toeic.p4", name: "Part 4 – Bài nói ngắn", skill: "listening", questionCount: 30, hasAudio: true, hasImage: false, choiceCount: 4 },
  { id: "toeic.p5", name: "Part 5 – Hoàn thành câu", skill: "reading", questionCount: 30, hasAudio: false, hasImage: false, choiceCount: 4 },
  { id: "toeic.p6", name: "Part 6 – Hoàn thành đoạn văn", skill: "reading", questionCount: 16, hasAudio: false, hasImage: false, choiceCount: 4 },
  { id: "toeic.p7", name: "Part 7 – Đọc hiểu", skill: "reading", questionCount: 54, hasAudio: false, hasImage: false, choiceCount: 4 },
];

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const TOEIC: CertificateSpec = {
  id: "toeic",
  name: "TOEIC Listening & Reading",
  sections,
  timeLimits: { listening: 45, reading: 75 },
  score(correctBySection) {
    let listening = 0;
    let reading = 0;
    for (const s of sections) {
      const n = correctBySection[s.id] ?? 0;
      if (s.skill === "listening") listening += n;
      else reading += n;
    }
    const parts = { listening: LISTENING[clamp(listening)], reading: READING[clamp(reading)] };
    return { parts, total: parts.listening + parts.reading };
  },
};
```

```ts
// src/features/certificates/index.ts
import type { CertificateSpec, SectionSpec } from "./types";
import { TOEIC } from "./toeic";

export type { CertificateSpec, SectionSpec, ScoreResult, Skill } from "./types";
export { TOEIC };

export const CERTIFICATES: CertificateSpec[] = [TOEIC];

export function getCertificate(id: string): CertificateSpec {
  const c = CERTIFICATES.find((x) => x.id === id);
  if (!c) throw new Error("UNKNOWN_CERTIFICATE");
  return c;
}

export function getSection(cert: CertificateSpec, sectionId: string): SectionSpec | undefined {
  return cert.sections.find((s) => s.id === sectionId);
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- src/features/certificates/toeic.test.ts`
Expected: PASS 6 test.

- [ ] **Step 5: Commit**

```bash
git add src/features/certificates
git commit -m "feat: CertificateSpec TOEIC với bảng quy đổi điểm"
```

---

### Task 2: Schema Prisma cho ngân hàng câu hỏi và lượt làm bài

**Files:**
- Modify: `prisma/schema.prisma` (thêm quan hệ `attempts Attempt[]` vào `model User`; thêm enum và model mới ở cuối)
- Create: migration bằng `npm run db:migrate -- --name question_bank`

**Interfaces:**
- Produces: model `QuestionGroup`, `Question`, `Exam`, `ExamQuestion`, `Attempt`, `AttemptAnswer`; enum `ContentStatus { DRAFT PUBLISHED }`, `QuestionSource { AI IMPORT MANUAL }`, `AttemptType { EXAM DRILL }`. Unique `AttemptAnswer @@unique([attemptId, questionId])` → tên trong Prisma Client là `attemptId_questionId`.

- [ ] **Step 1: Sửa `prisma/schema.prisma`**

Trong `model User`, sau dòng `userWords     UserWord[]` thêm `attempts      Attempt[]`. Rồi thêm vào cuối file:

```prisma
enum ContentStatus {
  DRAFT
  PUBLISHED
}

enum QuestionSource {
  AI
  IMPORT
  MANUAL
}

enum AttemptType {
  EXAM
  DRILL
}

model QuestionGroup {
  id          String     @id @default(cuid())
  certificate String     @default("toeic")
  section     String
  passage     String?
  transcript  String?
  audioUrl    String?
  imageUrl    String?
  questions   Question[]
}

model Question {
  id             String          @id @default(cuid())
  certificate    String          @default("toeic")
  section        String
  status         ContentStatus   @default(DRAFT)
  groupId        String?
  group          QuestionGroup?  @relation(fields: [groupId], references: [id], onDelete: SetNull)
  stem           String?
  choices        Json
  answer         Int
  explanation    String
  skillTags      String[]        @default([])
  audioUrl       String?
  imageUrl       String?
  transcript     String?
  source         QuestionSource  @default(IMPORT)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  examQuestions  ExamQuestion[]
  attemptAnswers AttemptAnswer[]

  @@index([certificate, section, status])
}

model Exam {
  id          String         @id @default(cuid())
  certificate String         @default("toeic")
  title       String
  status      ContentStatus  @default(DRAFT)
  createdAt   DateTime       @default(now())
  questions   ExamQuestion[]
  attempts    Attempt[]
}

model ExamQuestion {
  examId     String
  questionId String
  order      Int
  exam       Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@id([examId, questionId])
  @@index([examId, order])
}

model Attempt {
  id          String          @id @default(cuid())
  userId      String
  certificate String          @default("toeic")
  type        AttemptType
  examId      String?
  startedAt   DateTime        @default(now())
  submittedAt DateTime?
  overtime    Boolean         @default(false)
  scores      Json?
  config      Json?
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  exam        Exam?           @relation(fields: [examId], references: [id], onDelete: SetNull)
  answers     AttemptAnswer[]

  @@index([userId, certificate, submittedAt])
}

model AttemptAnswer {
  id         String   @id @default(cuid())
  attemptId  String
  questionId String
  order      Int
  chosen     Int?
  isCorrect  Boolean?
  attempt    Attempt  @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([attemptId, questionId])
  @@index([attemptId, order])
}
```

- [ ] **Step 2: Tạo migration (Postgres phải đang chạy: `npm run db:up`)**

Run: `npm run db:migrate -- --name question_bank`
Expected: thư mục `prisma/migrations/<timestamp>_question_bank/migration.sql` xuất hiện, Prisma Client sinh lại, không lỗi.

- [ ] **Step 3: Kiểm tra kiểu và test cũ**

Run: `npm run typecheck && npm test`
Expected: 0 lỗi, toàn bộ test cũ vẫn pass.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: schema Question, QuestionGroup, Exam, Attempt, AttemptAnswer"
```

---

### Task 3: Nhập câu hỏi từ file JSON (schema zod, hàm nhập, script, fixture)

**Files:**
- Create: `src/features/questions/import-schema.ts`
- Create: `src/features/questions/import-questions.ts`
- Create: `prisma/seed/import-questions.ts`
- Create: `prisma/seed/fixtures/questions-sample.json`
- Modify: `package.json` (thêm script `"db:import-questions": "tsx prisma/seed/import-questions.ts"`)
- Test: `src/features/questions/import-questions.test.ts`

**Interfaces:**
- Consumes: `getCertificate`, `getSection` (Task 1).
- Produces:
  - `questionFileSchema` (zod) và `type QuestionFile = z.infer<typeof questionFileSchema>`
  - `type ImportDb = Pick<PrismaClient, "questionGroup" | "question" | "exam" | "examQuestion">`
  - `importQuestions(db: ImportDb, data: QuestionFile, opts: { publish: boolean; examTitle?: string }): Promise<{ groups: number; questions: number; examId: string | null }>`
  - Ném `Error("INVALID_SECTION:<id>")`, `Error("INVALID_CHOICES:<index>")`, `Error("UNKNOWN_GROUP:<key>")`.

Định dạng file JSON:

```json
{
  "certificate": "toeic",
  "groups": [{ "key": "g1", "section": "toeic.p6", "passage": "Dear Mr. Lee, ..." }],
  "questions": [
    { "section": "toeic.p5", "stem": "The report ___ by Friday.", "choices": ["submit", "submitted", "will be submitted", "submitting"], "answer": 2, "explanation": "Bị động tương lai.", "skillTags": ["grammar.passive"] },
    { "section": "toeic.p6", "groupKey": "g1", "stem": "(131)", "choices": ["a", "b", "c", "d"], "answer": 0, "explanation": "..." }
  ]
}
```

- [ ] **Step 1: Viết test**

```ts
// src/features/questions/import-questions.test.ts
import { describe, it, expect, vi } from "vitest";
import { importQuestions, type ImportDb } from "./import-questions";
import { questionFileSchema } from "./import-schema";

function fakeDb() {
  const groups: Array<Record<string, unknown>> = [];
  const questions: Array<Record<string, unknown>> = [];
  const examQuestions: Array<Record<string, unknown>> = [];
  let n = 0;
  const db = {
    questionGroup: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const g = { id: `g${++n}`, ...data }; groups.push(g); return g; }) },
    question: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const q = { id: `q${++n}`, ...data }; questions.push(q); return q; }) },
    exam: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "e1", ...data })) },
    examQuestion: { createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => { examQuestions.push(...data); return { count: data.length }; }) },
  };
  return { db: db as unknown as ImportDb, raw: db, groups, questions, examQuestions };
}

const base = {
  certificate: "toeic",
  groups: [{ key: "g1", section: "toeic.p6", passage: "Dear all, ..." }],
  questions: [
    { section: "toeic.p5", stem: "The report ___ by Friday.", choices: ["submit", "submitted", "will be submitted", "submitting"], answer: 2, explanation: "Bị động.", skillTags: ["grammar.passive"] },
    { section: "toeic.p6", groupKey: "g1", stem: "(131)", choices: ["a", "b", "c", "d"], answer: 0, explanation: "x" },
  ],
};

describe("questionFileSchema", () => {
  it("chấp nhận file hợp lệ, mặc định certificate toeic và skillTags rỗng", () => {
    const r = questionFileSchema.safeParse({ questions: [base.questions[1]] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.certificate).toBe("toeic");
      expect(r.data.questions[0].skillTags).toEqual([]);
    }
  });

  it("từ chối answer vượt số lựa chọn", () => {
    const r = questionFileSchema.safeParse({ questions: [{ ...base.questions[0], answer: 4 }] });
    expect(r.success).toBe(false);
  });
});

describe("importQuestions", () => {
  it("tạo group, gắn groupId cho câu, đặt PUBLISHED khi publish", async () => {
    const { db, groups, questions } = fakeDb();
    const r = await importQuestions(db, questionFileSchema.parse(base), { publish: true });
    expect(r).toEqual({ groups: 1, questions: 2, examId: null });
    expect(groups[0]).toMatchObject({ certificate: "toeic", section: "toeic.p6", passage: "Dear all, ..." });
    expect(questions[1]).toMatchObject({ groupId: "g1", status: "PUBLISHED", source: "IMPORT", skillTags: [] });
    expect(questions[0]).toMatchObject({ status: "PUBLISHED", skillTags: ["grammar.passive"], answer: 2 });
  });

  it("tạo đề với thứ tự câu khi có examTitle", async () => {
    const { db, raw, examQuestions } = fakeDb();
    const r = await importQuestions(db, questionFileSchema.parse(base), { publish: true, examTitle: "Đề mẫu" });
    expect(r.examId).toBe("e1");
    expect(raw.exam.create).toHaveBeenCalledWith({ data: { certificate: "toeic", title: "Đề mẫu", status: "PUBLISHED" } });
    expect(examQuestions.map((x) => x.order)).toEqual([1, 2]);
  });

  it("section không có trong chứng chỉ → INVALID_SECTION", async () => {
    const { db } = fakeDb();
    const bad = questionFileSchema.parse({ questions: [{ ...base.questions[0], section: "toeic.p9" }] });
    await expect(importQuestions(db, bad, { publish: false })).rejects.toThrow("INVALID_SECTION:toeic.p9");
  });

  it("số lựa chọn khác choiceCount của section → INVALID_CHOICES", async () => {
    const { db } = fakeDb();
    const bad = questionFileSchema.parse({ questions: [{ ...base.questions[0], section: "toeic.p2" }] });
    await expect(importQuestions(db, bad, { publish: false })).rejects.toThrow("INVALID_CHOICES:0");
  });

  it("groupKey không khai báo → UNKNOWN_GROUP", async () => {
    const { db } = fakeDb();
    const bad = questionFileSchema.parse({ questions: [{ ...base.questions[1], groupKey: "nope" }] });
    await expect(importQuestions(db, bad, { publish: false })).rejects.toThrow("UNKNOWN_GROUP:nope");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/features/questions/import-questions.test.ts`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết schema zod và hàm nhập**

```ts
// src/features/questions/import-schema.ts
import { z } from "zod";

const questionItem = z
  .object({
    section: z.string().min(1),
    groupKey: z.string().min(1).optional(),
    stem: z.string().max(2000).optional(),
    choices: z.array(z.string().min(1)).min(3).max(4),
    answer: z.number().int().min(0),
    explanation: z.string().min(1).max(3000),
    skillTags: z.array(z.string().min(1)).default([]),
    audioUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    transcript: z.string().max(5000).optional(),
  })
  .refine((q) => q.answer < q.choices.length, { message: "answer phải nhỏ hơn số lựa chọn" });

export const questionFileSchema = z.object({
  certificate: z.string().min(1).default("toeic"),
  groups: z
    .array(
      z.object({
        key: z.string().min(1),
        section: z.string().min(1),
        passage: z.string().max(10000).optional(),
        transcript: z.string().max(10000).optional(),
        audioUrl: z.string().url().optional(),
        imageUrl: z.string().url().optional(),
      }),
    )
    .default([]),
  questions: z.array(questionItem).min(1),
});

export type QuestionFile = z.infer<typeof questionFileSchema>;
```

```ts
// src/features/questions/import-questions.ts
import type { PrismaClient } from "@prisma/client";
import { getCertificate, getSection } from "@/features/certificates";
import type { QuestionFile } from "./import-schema";

export type ImportDb = Pick<PrismaClient, "questionGroup" | "question" | "exam" | "examQuestion">;

export type ImportResult = { groups: number; questions: number; examId: string | null };

export async function importQuestions(
  db: ImportDb,
  data: QuestionFile,
  opts: { publish: boolean; examTitle?: string },
): Promise<ImportResult> {
  const cert = getCertificate(data.certificate);
  const status = opts.publish ? "PUBLISHED" : "DRAFT";

  // Kiểm tra toàn bộ trước khi ghi để không nhập nửa chừng
  for (const g of data.groups) {
    if (!getSection(cert, g.section)) throw new Error(`INVALID_SECTION:${g.section}`);
  }
  const groupKeys = new Set(data.groups.map((g) => g.key));
  data.questions.forEach((q, i) => {
    const s = getSection(cert, q.section);
    if (!s) throw new Error(`INVALID_SECTION:${q.section}`);
    if (q.choices.length !== s.choiceCount) throw new Error(`INVALID_CHOICES:${i}`);
    if (q.groupKey && !groupKeys.has(q.groupKey)) throw new Error(`UNKNOWN_GROUP:${q.groupKey}`);
  });

  const groupIds = new Map<string, string>();
  for (const g of data.groups) {
    const created = await db.questionGroup.create({
      data: { certificate: cert.id, section: g.section, passage: g.passage, transcript: g.transcript, audioUrl: g.audioUrl, imageUrl: g.imageUrl },
    });
    groupIds.set(g.key, created.id);
  }

  const questionIds: string[] = [];
  for (const q of data.questions) {
    const created = await db.question.create({
      data: {
        certificate: cert.id,
        section: q.section,
        status,
        groupId: q.groupKey ? groupIds.get(q.groupKey) : undefined,
        stem: q.stem,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        skillTags: q.skillTags,
        audioUrl: q.audioUrl,
        imageUrl: q.imageUrl,
        transcript: q.transcript,
        source: "IMPORT",
      },
    });
    questionIds.push(created.id);
  }

  let examId: string | null = null;
  if (opts.examTitle) {
    const exam = await db.exam.create({ data: { certificate: cert.id, title: opts.examTitle, status } });
    examId = exam.id;
    await db.examQuestion.createMany({ data: questionIds.map((questionId, i) => ({ examId: exam.id, questionId, order: i + 1 })) });
  }

  return { groups: data.groups.length, questions: data.questions.length, examId };
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- src/features/questions/import-questions.test.ts`
Expected: PASS 7 test.

- [ ] **Step 5: Script CLI**

```ts
// prisma/seed/import-questions.ts
// Dùng: npm run db:import-questions -- prisma/seed/fixtures/questions-sample.json [--exam "Đề mẫu 1"] [--draft]
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { questionFileSchema } from "../../src/features/questions/import-schema";
import { importQuestions } from "../../src/features/questions/import-questions";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--exam");
  if (!file) {
    console.error('Cách dùng: npm run db:import-questions -- <file.json> [--exam "Tên đề"] [--draft]');
    process.exit(1);
  }
  const examIdx = args.indexOf("--exam");
  const examTitle = examIdx >= 0 ? args[examIdx + 1] : undefined;
  const publish = !args.includes("--draft");

  const raw = JSON.parse(await readFile(file, "utf8"));
  const parsed = questionFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("File không hợp lệ:");
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const r = await importQuestions(prisma, parsed.data, { publish, examTitle });
    console.log(`Đã nhập ${r.questions} câu, ${r.groups} nhóm${r.examId ? `, tạo đề ${r.examId}` : ""} (${publish ? "PUBLISHED" : "DRAFT"}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
```

Thêm vào `package.json` phần `scripts`: `"db:import-questions": "tsx prisma/seed/import-questions.ts"`. Kiểm tra `tsx` đã có trong devDependencies (script `db:import-dict` đang dùng); nếu chưa thì `npm i -D tsx`.

- [ ] **Step 6: Fixture 12 câu mẫu**

Tạo `prisma/seed/fixtures/questions-sample.json` với nội dung sau (6 câu Part 5, 1 nhóm Part 6 có 4 câu, 1 nhóm Part 7 có 2 câu):

```json
{
  "certificate": "toeic",
  "groups": [
    { "key": "memo", "section": "toeic.p6", "passage": "To: All staff\nFrom: Facilities Department\n\nPlease note that the main parking lot will be closed for resurfacing from Monday, June 3 ___(131) Wednesday, June 5. During this period, employees are asked to park in the overflow lot behind Building C. ___(132). We apologize for any inconvenience this may cause. If you have questions, ___(133) contact the Facilities Department at extension 2200. Thank you for your ___(134)." },
    { "key": "ad", "section": "toeic.p7", "passage": "GreenLeaf Café – Grand Opening!\nJoin us on Saturday, May 18, from 8 A.M. to 4 P.M. for the opening of our second location at 42 Harbor Street. The first 50 customers will receive a free reusable cup. Present this advertisement to get 20% off any drink all day." }
  ],
  "questions": [
    { "section": "toeic.p5", "stem": "The quarterly report ___ to the board by the end of this week.", "choices": ["submits", "submitted", "will be submitted", "submitting"], "answer": 2, "explanation": "Chủ ngữ 'report' chịu tác động nên dùng bị động; 'by the end of this week' chỉ tương lai → 'will be submitted'.", "skillTags": ["grammar.passive", "grammar.tense"] },
    { "section": "toeic.p5", "stem": "Ms. Alvarez has worked at the company ___ 2015.", "choices": ["for", "since", "during", "from"], "answer": 1, "explanation": "'since' + mốc thời gian đi với thì hiện tại hoàn thành.", "skillTags": ["grammar.preposition"] },
    { "section": "toeic.p5", "stem": "All visitors must wear a badge ___ inside the laboratory.", "choices": ["while", "during", "although", "despite"], "answer": 0, "explanation": "'while' + mệnh đề rút gọn (while [they are] inside); 'during' cần danh từ.", "skillTags": ["grammar.conjunction"] },
    { "section": "toeic.p5", "stem": "The new software is ___ easier to use than the previous version.", "choices": ["consider", "considerable", "considerably", "consideration"], "answer": 2, "explanation": "Cần trạng từ bổ nghĩa cho so sánh hơn 'easier' → 'considerably'.", "skillTags": ["vocab.word-form"] },
    { "section": "toeic.p5", "stem": "Please review the attached contract and return it with your ___ by Friday.", "choices": ["sign", "signed", "signature", "signing"], "answer": 2, "explanation": "Sau tính từ sở hữu 'your' cần danh từ → 'signature'.", "skillTags": ["vocab.word-form"] },
    { "section": "toeic.p5", "stem": "Neither the manager ___ the assistants were informed of the schedule change.", "choices": ["or", "nor", "and", "but"], "answer": 1, "explanation": "Cấu trúc 'neither ... nor'.", "skillTags": ["grammar.correlative"] },
    { "section": "toeic.p6", "groupKey": "memo", "stem": "(131)", "choices": ["through", "until", "by", "at"], "answer": 0, "explanation": "'from ... through ...' chỉ khoảng thời gian bao gồm cả ngày cuối.", "skillTags": ["grammar.preposition"] },
    { "section": "toeic.p6", "groupKey": "memo", "stem": "(132)", "choices": ["Shuttle buses will run every 15 minutes.", "The cafeteria menu has been updated.", "Applications are due next month.", "The lot was built in 1998."], "answer": 0, "explanation": "Câu chèn phải liên quan bãi đỗ tạm → xe đưa đón.", "skillTags": ["reading.sentence-insertion"] },
    { "section": "toeic.p6", "groupKey": "memo", "stem": "(133)", "choices": ["pleased", "pleasing", "please", "pleasure"], "answer": 2, "explanation": "Câu mệnh lệnh lịch sự: 'please contact'.", "skillTags": ["vocab.word-form"] },
    { "section": "toeic.p6", "groupKey": "memo", "stem": "(134)", "choices": ["cooperation", "competition", "collection", "correction"], "answer": 0, "explanation": "'Thank you for your cooperation' là cụm quen thuộc.", "skillTags": ["vocab.collocation"] },
    { "section": "toeic.p7", "groupKey": "ad", "stem": "What is indicated about GreenLeaf Café?", "choices": ["It is closing one of its locations.", "It has more than one location.", "It opens at 4 P.M. on Saturdays.", "It sells reusable cups."], "answer": 1, "explanation": "'our second location' → có hơn một cơ sở.", "skillTags": ["reading.detail"] },
    { "section": "toeic.p7", "groupKey": "ad", "stem": "How can a customer receive a discount?", "choices": ["By arriving before 8 A.M.", "By bringing a reusable cup", "By showing the advertisement", "By ordering two drinks"], "answer": 2, "explanation": "'Present this advertisement to get 20% off'.", "skillTags": ["reading.detail"] }
  ]
}
```

- [ ] **Step 7: Chạy script thật với Postgres**

Run: `npm run db:import-questions -- prisma/seed/fixtures/questions-sample.json --exam "Đề rút gọn 1"`
Expected: `Đã nhập 12 câu, 2 nhóm, tạo đề <id> (PUBLISHED).`

- [ ] **Step 8: Commit**

```bash
git add src/features/questions prisma/seed package.json package-lock.json
git commit -m "feat: nhập câu hỏi và đề từ file JSON, fixture 12 câu mẫu"
```

---

### Task 4: DTO câu hỏi cho client, lấy mẫu có trọng số, chọn câu drill

**Files:**
- Create: `src/features/questions/dto.ts`
- Create: `src/features/drill/weighted-sample.ts`
- Create: `src/features/drill/pick-questions.ts`
- Test: `src/features/drill/weighted-sample.test.ts`, `src/features/drill/pick-questions.test.ts`, `src/features/questions/dto.test.ts`

**Interfaces:**
- Produces:
  - `type QuestionForClient = { id: string; section: string; order: number; stem: string | null; choices: string[]; audioUrl: string | null; imageUrl: string | null; group: { id: string; passage: string | null; audioUrl: string | null; imageUrl: string | null } | null; chosen: number | null }`
  - `toClientQuestion(q: Question & { group: QuestionGroup | null }, order: number, chosen: number | null): QuestionForClient` — **không** chứa `answer`, `explanation`, `transcript`.
  - `weightedSample<T>(items: T[], weightOf: (t: T) => number, count: number, rand?: () => number): T[]` — không lặp, trả tối đa `min(count, items.length)`.
  - `type PickDb = Pick<PrismaClient, "question" | "attemptAnswer">`
  - `pickDrillQuestions(db: PickDb, p: { userId: string; certificate: string; section: string; skillTags?: string[]; count: number; rand?: () => number }): Promise<string[]>` — trả id câu; ném `Error("NOT_ENOUGH_QUESTIONS")` khi không có câu nào; trọng số: chưa làm 3, lần gần nhất sai 2, lần gần nhất đúng 1.

- [ ] **Step 1: Viết test**

```ts
// src/features/questions/dto.test.ts
import { describe, it, expect } from "vitest";
import type { Question, QuestionGroup } from "@prisma/client";
import { toClientQuestion } from "./dto";

const q: Question & { group: QuestionGroup | null } = {
  id: "q1", certificate: "toeic", section: "toeic.p6", status: "PUBLISHED", groupId: "g1",
  stem: "(131)", choices: ["a", "b", "c", "d"], answer: 1, explanation: "bí mật", skillTags: [],
  audioUrl: null, imageUrl: null, transcript: "bí mật 2", source: "IMPORT", createdAt: new Date(), updatedAt: new Date(),
  group: { id: "g1", certificate: "toeic", section: "toeic.p6", passage: "Dear all", transcript: null, audioUrl: null, imageUrl: null },
};

describe("toClientQuestion", () => {
  it("giữ stem, choices, group.passage và chosen; bỏ answer, explanation, transcript", () => {
    const c = toClientQuestion(q, 3, 2);
    expect(c).toEqual({
      id: "q1", section: "toeic.p6", order: 3, stem: "(131)", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null,
      group: { id: "g1", passage: "Dear all", audioUrl: null, imageUrl: null }, chosen: 2,
    });
    expect(JSON.stringify(c)).not.toContain("bí mật");
  });

  it("group null thì trả null", () => {
    expect(toClientQuestion({ ...q, group: null }, 1, null).group).toBeNull();
  });
});
```

```ts
// src/features/drill/weighted-sample.test.ts
import { describe, it, expect } from "vitest";
import { weightedSample } from "./weighted-sample";

// rand tất định: trả lần lượt các giá trị trong mảng
function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("weightedSample", () => {
  it("không lặp phần tử và trả đúng số lượng", () => {
    const r = weightedSample([1, 2, 3, 4, 5], () => 1, 3, seq([0.1, 0.5, 0.9]));
    expect(r).toHaveLength(3);
    expect(new Set(r).size).toBe(3);
  });

  it("count lớn hơn số phần tử thì trả tất cả", () => {
    expect(weightedSample(["a", "b"], () => 1, 5, seq([0.3])).sort()).toEqual(["a", "b"]);
  });

  it("phần tử trọng số lớn được chọn trước khi rand nhỏ", () => {
    // trọng số: a=3, b=1 → tổng 4; rand 0.5*4 = 2 rơi vào a (0–3)
    expect(weightedSample(["a", "b"], (x) => (x === "a" ? 3 : 1), 1, seq([0.5]))).toEqual(["a"]);
    // rand 0.9*4 = 3.6 rơi vào b (3–4)
    expect(weightedSample(["a", "b"], (x) => (x === "a" ? 3 : 1), 1, seq([0.9]))).toEqual(["b"]);
  });

  it("phần tử trọng số 0 chỉ được chọn khi không còn gì khác", () => {
    const r = weightedSample(["zero", "one"], (x) => (x === "zero" ? 0 : 1), 2, seq([0.5]));
    expect(r[0]).toBe("one");
    expect(r[1]).toBe("zero");
  });
});
```

```ts
// src/features/drill/pick-questions.test.ts
import { describe, it, expect, vi } from "vitest";
import { pickDrillQuestions, type PickDb } from "./pick-questions";

function fakeDb(ids: string[], history: Array<{ questionId: string; isCorrect: boolean | null }>) {
  const question = { findMany: vi.fn(async () => ids.map((id) => ({ id }))) };
  const attemptAnswer = { findMany: vi.fn(async () => history) };
  return { db: { question, attemptAnswer } as unknown as PickDb, question, attemptAnswer };
}

describe("pickDrillQuestions", () => {
  it("truy vấn câu PUBLISHED đúng certificate/section, lọc skillTags bằng hasSome", async () => {
    const { db, question } = fakeDb(["a", "b"], []);
    await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", skillTags: ["grammar.tense"], count: 2 });
    expect(question.findMany).toHaveBeenCalledWith({
      where: { certificate: "toeic", section: "toeic.p5", status: "PUBLISHED", skillTags: { hasSome: ["grammar.tense"] } },
      select: { id: true },
    });
  });

  it("không có câu nào → NOT_ENOUGH_QUESTIONS", async () => {
    const { db } = fakeDb([], []);
    await expect(pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 10 })).rejects.toThrow("NOT_ENOUGH_QUESTIONS");
  });

  it("thiếu câu thì trả ít hơn count, không ném", async () => {
    const { db } = fakeDb(["a", "b", "c"], []);
    const r = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 10 });
    expect(r.sort()).toEqual(["a", "b", "c"]);
  });

  it("ưu tiên câu chưa làm (3) > làm sai gần nhất (2) > làm đúng (1)", async () => {
    // history sắp theo lần làm mới nhất trước: q "wrong" sai, q "right" đúng, "unseen" không có
    const { db } = fakeDb(["right", "wrong", "unseen"], [
      { questionId: "wrong", isCorrect: false },
      { questionId: "right", isCorrect: true },
      { questionId: "wrong", isCorrect: true }, // lần cũ hơn, phải bị bỏ qua
    ]);
    // tổng trọng số = 1 + 2 + 3 = 6 theo thứ tự ids [right, wrong, unseen]; rand 0.99*6 = 5.94 → unseen
    const r1 = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 1, rand: () => 0.99 });
    expect(r1).toEqual(["unseen"]);
    // rand 0.3*6 = 1.8 → wrong (1–3)
    const r2 = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 1, rand: () => 0.3 });
    expect(r2).toEqual(["wrong"]);
    // rand 0.1*6 = 0.6 → right (0–1)
    const r3 = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 1, rand: () => 0.1 });
    expect(r3).toEqual(["right"]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/features/drill src/features/questions/dto.test.ts`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết code**

```ts
// src/features/questions/dto.ts
import type { Question, QuestionGroup } from "@prisma/client";

export type QuestionForClient = {
  id: string;
  section: string;
  order: number;
  stem: string | null;
  choices: string[];
  audioUrl: string | null;
  imageUrl: string | null;
  group: { id: string; passage: string | null; audioUrl: string | null; imageUrl: string | null } | null;
  chosen: number | null;
};

/** Bỏ đáp án, giải thích, transcript trước khi gửi xuống client. */
export function toClientQuestion(q: Question & { group: QuestionGroup | null }, order: number, chosen: number | null): QuestionForClient {
  return {
    id: q.id,
    section: q.section,
    order,
    stem: q.stem,
    choices: q.choices as string[],
    audioUrl: q.audioUrl,
    imageUrl: q.imageUrl,
    group: q.group ? { id: q.group.id, passage: q.group.passage, audioUrl: q.group.audioUrl, imageUrl: q.group.imageUrl } : null,
    chosen,
  };
}
```

```ts
// src/features/drill/weighted-sample.ts
/** Rút `count` phần tử không lặp theo trọng số. Trọng số 0 chỉ được chọn khi mọi phần tử còn lại đều 0. */
export function weightedSample<T>(items: T[], weightOf: (t: T) => number, count: number, rand: () => number = Math.random): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(0, weightOf(item)) }));
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let idx = 0;
    if (total > 0) {
      let r = rand() * total;
      for (idx = 0; idx < pool.length; idx++) {
        r -= pool[idx].w;
        if (r < 0) break;
      }
      if (idx >= pool.length) idx = pool.length - 1;
    } else {
      idx = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}
```

```ts
// src/features/drill/pick-questions.ts
import type { PrismaClient } from "@prisma/client";
import { weightedSample } from "./weighted-sample";

export type PickDb = Pick<PrismaClient, "question" | "attemptAnswer">;

export type PickParams = {
  userId: string;
  certificate: string;
  section: string;
  skillTags?: string[];
  count: number;
  rand?: () => number;
};

const WEIGHT_UNSEEN = 3;
const WEIGHT_WRONG = 2;
const WEIGHT_RIGHT = 1;

export async function pickDrillQuestions(db: PickDb, p: PickParams): Promise<string[]> {
  const rows = await db.question.findMany({
    where: {
      certificate: p.certificate,
      section: p.section,
      status: "PUBLISHED",
      ...(p.skillTags && p.skillTags.length > 0 ? { skillTags: { hasSome: p.skillTags } } : {}),
    },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) throw new Error("NOT_ENOUGH_QUESTIONS");

  // Lần trả lời gần nhất của người dùng cho từng câu (mới nhất trước)
  const history = await db.attemptAnswer.findMany({
    where: { questionId: { in: ids }, chosen: { not: null }, attempt: { userId: p.userId } },
    orderBy: { attempt: { startedAt: "desc" } },
    select: { questionId: true, isCorrect: true },
  });
  const latest = new Map<string, boolean | null>();
  for (const h of history) if (!latest.has(h.questionId)) latest.set(h.questionId, h.isCorrect);

  const weightOf = (id: string) => {
    if (!latest.has(id)) return WEIGHT_UNSEEN;
    return latest.get(id) ? WEIGHT_RIGHT : WEIGHT_WRONG;
  };
  return weightedSample(ids, weightOf, p.count, p.rand);
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- src/features/drill src/features/questions/dto.test.ts`
Expected: PASS 10 test.

- [ ] **Step 5: Commit**

```bash
git add src/features/questions/dto.ts src/features/questions/dto.test.ts src/features/drill
git commit -m "feat: DTO câu hỏi cho client và chọn câu drill theo trọng số"
```

---

### Task 5: Bắt đầu drill, bắt đầu thi, nạp lượt làm bài

**Files:**
- Create: `src/features/attempts/load-owned.ts`
- Create: `src/features/attempts/start-drill.ts`
- Create: `src/features/attempts/start-exam.ts`
- Create: `src/features/attempts/get-attempt.ts`
- Test: `src/features/attempts/start-drill.test.ts`, `src/features/attempts/start-exam.test.ts`, `src/features/attempts/get-attempt.test.ts`

**Interfaces:**
- Consumes: `pickDrillQuestions` (Task 4), `toClientQuestion` (Task 4), `getCertificate`, `getSection` (Task 1).
- Produces:
  - `loadOwnedAttempt(db: Pick<PrismaClient, "attempt">, attemptId: string, userId: string): Promise<Attempt>` — ném `NOT_FOUND` / `FORBIDDEN`.
  - `type StartDrillDb = Pick<PrismaClient, "question" | "attemptAnswer" | "attempt">`; `startDrill(db, p: { userId: string; certificate: string; section: string; skillTags?: string[]; count: number }): Promise<{ attemptId: string; count: number }>` — ném `INVALID` nếu section không thuộc chứng chỉ.
  - `type StartExamDb = Pick<PrismaClient, "exam" | "examQuestion" | "attempt" | "attemptAnswer">`; `startExam(db, p: { userId: string; examId: string }): Promise<{ attemptId: string }>` — ném `NOT_FOUND` nếu đề không tồn tại hoặc chưa PUBLISHED.
  - `type AttemptForClient = { id: string; type: "EXAM" | "DRILL"; certificate: string; examId: string | null; startedAt: string; submittedAt: string | null; config: { section?: string; skillTags?: string[]; count?: number } | null; questions: QuestionForClient[] }`
  - `type GetAttemptDb = Pick<PrismaClient, "attempt" | "attemptAnswer">`; `getAttemptForUser(db, p: { attemptId: string; userId: string }): Promise<AttemptForClient>`

- [ ] **Step 1: Viết test**

```ts
// src/features/attempts/start-drill.test.ts
import { describe, it, expect, vi } from "vitest";
import { startDrill, type StartDrillDb } from "./start-drill";

vi.mock("@/features/drill/pick-questions", () => ({
  pickDrillQuestions: vi.fn(async () => ["q2", "q1", "q3"]),
}));

function fakeDb() {
  const attempt = { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "a1", ...data })) };
  const attemptAnswer = { createMany: vi.fn(async () => ({ count: 3 })) };
  return { db: { attempt, attemptAnswer, question: {} } as unknown as StartDrillDb, attempt, attemptAnswer };
}

describe("startDrill", () => {
  it("tạo Attempt DRILL với config và các AttemptAnswer theo thứ tự đã chọn", async () => {
    const { db, attempt, attemptAnswer } = fakeDb();
    const r = await startDrill(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", skillTags: ["x"], count: 3 });
    expect(r).toEqual({ attemptId: "a1", count: 3 });
    expect(attempt.create).toHaveBeenCalledWith({
      data: { userId: "u1", certificate: "toeic", type: "DRILL", config: { section: "toeic.p5", skillTags: ["x"], count: 3 } },
    });
    expect(attemptAnswer.createMany).toHaveBeenCalledWith({
      data: [
        { attemptId: "a1", questionId: "q2", order: 1 },
        { attemptId: "a1", questionId: "q1", order: 2 },
        { attemptId: "a1", questionId: "q3", order: 3 },
      ],
    });
  });

  it("section không thuộc chứng chỉ → INVALID", async () => {
    const { db } = fakeDb();
    await expect(startDrill(db, { userId: "u1", certificate: "toeic", section: "toeic.p9", count: 3 })).rejects.toThrow("INVALID");
  });
});
```

```ts
// src/features/attempts/start-exam.test.ts
import { describe, it, expect, vi } from "vitest";
import { startExam, type StartExamDb } from "./start-exam";

function fakeDb(exam: { id: string; status: string; certificate: string } | null) {
  const db = {
    exam: { findUnique: vi.fn(async () => exam) },
    examQuestion: { findMany: vi.fn(async () => [{ questionId: "q1", order: 1 }, { questionId: "q2", order: 2 }]) },
    attempt: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "a9", ...data })) },
    attemptAnswer: { createMany: vi.fn(async () => ({ count: 2 })) },
  };
  return { db: db as unknown as StartExamDb, raw: db };
}

describe("startExam", () => {
  it("tạo Attempt EXAM với examId và AttemptAnswer theo order của đề", async () => {
    const { db, raw } = fakeDb({ id: "e1", status: "PUBLISHED", certificate: "toeic" });
    const r = await startExam(db, { userId: "u1", examId: "e1" });
    expect(r).toEqual({ attemptId: "a9" });
    expect(raw.attempt.create).toHaveBeenCalledWith({ data: { userId: "u1", certificate: "toeic", type: "EXAM", examId: "e1" } });
    expect(raw.attemptAnswer.createMany).toHaveBeenCalledWith({
      data: [{ attemptId: "a9", questionId: "q1", order: 1 }, { attemptId: "a9", questionId: "q2", order: 2 }],
    });
  });

  it("đề không tồn tại → NOT_FOUND", async () => {
    const { db } = fakeDb(null);
    await expect(startExam(db, { userId: "u1", examId: "x" })).rejects.toThrow("NOT_FOUND");
  });

  it("đề DRAFT → NOT_FOUND", async () => {
    const { db } = fakeDb({ id: "e1", status: "DRAFT", certificate: "toeic" });
    await expect(startExam(db, { userId: "u1", examId: "e1" })).rejects.toThrow("NOT_FOUND");
  });
});
```

```ts
// src/features/attempts/get-attempt.test.ts
import { describe, it, expect, vi } from "vitest";
import { getAttemptForUser, type GetAttemptDb } from "./get-attempt";

const question = {
  id: "q1", certificate: "toeic", section: "toeic.p5", status: "PUBLISHED", groupId: null, stem: "S", choices: ["a", "b", "c", "d"],
  answer: 0, explanation: "E", skillTags: [], audioUrl: null, imageUrl: null, transcript: null, source: "IMPORT",
  createdAt: new Date(), updatedAt: new Date(), group: null,
};

function fakeDb(attempt: Record<string, unknown> | null) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: { findMany: vi.fn(async () => [{ id: "aa1", attemptId: "a1", questionId: "q1", order: 1, chosen: 2, isCorrect: null, question }]) },
  };
  return db as unknown as GetAttemptDb;
}

const started = new Date("2026-09-05T10:00:00Z");

describe("getAttemptForUser", () => {
  it("trả attempt và câu hỏi đã lọc, ngày dạng ISO", async () => {
    const db = fakeDb({ id: "a1", userId: "u1", type: "DRILL", certificate: "toeic", examId: null, startedAt: started, submittedAt: null, config: { section: "toeic.p5" } });
    const r = await getAttemptForUser(db, { attemptId: "a1", userId: "u1" });
    expect(r.startedAt).toBe("2026-09-05T10:00:00.000Z");
    expect(r.submittedAt).toBeNull();
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0]).toMatchObject({ id: "q1", order: 1, chosen: 2 });
    expect(JSON.stringify(r)).not.toContain('"answer"');
  });

  it("không tồn tại → NOT_FOUND; của người khác → FORBIDDEN", async () => {
    await expect(getAttemptForUser(fakeDb(null), { attemptId: "x", userId: "u1" })).rejects.toThrow("NOT_FOUND");
    const other = fakeDb({ id: "a1", userId: "u2", type: "DRILL", certificate: "toeic", examId: null, startedAt: started, submittedAt: null, config: null });
    await expect(getAttemptForUser(other, { attemptId: "a1", userId: "u1" })).rejects.toThrow("FORBIDDEN");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/features/attempts`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết code**

```ts
// src/features/attempts/load-owned.ts
import type { Attempt, PrismaClient } from "@prisma/client";

/** Nạp attempt, kiểm tra thuộc đúng người dùng. */
export async function loadOwnedAttempt(db: Pick<PrismaClient, "attempt">, attemptId: string, userId: string): Promise<Attempt> {
  const attempt = await db.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("NOT_FOUND");
  if (attempt.userId !== userId) throw new Error("FORBIDDEN");
  return attempt;
}
```

```ts
// src/features/attempts/start-drill.ts
import type { PrismaClient } from "@prisma/client";
import { getCertificate, getSection } from "@/features/certificates";
import { pickDrillQuestions } from "@/features/drill/pick-questions";

export type StartDrillDb = Pick<PrismaClient, "question" | "attemptAnswer" | "attempt">;

export type StartDrillParams = { userId: string; certificate: string; section: string; skillTags?: string[]; count: number };

export async function startDrill(db: StartDrillDb, p: StartDrillParams): Promise<{ attemptId: string; count: number }> {
  const cert = getCertificate(p.certificate);
  if (!getSection(cert, p.section)) throw new Error("INVALID");

  const ids = await pickDrillQuestions(db, { userId: p.userId, certificate: cert.id, section: p.section, skillTags: p.skillTags, count: p.count });

  const attempt = await db.attempt.create({
    data: { userId: p.userId, certificate: cert.id, type: "DRILL", config: { section: p.section, skillTags: p.skillTags ?? [], count: ids.length } },
  });
  await db.attemptAnswer.createMany({ data: ids.map((questionId, i) => ({ attemptId: attempt.id, questionId, order: i + 1 })) });
  return { attemptId: attempt.id, count: ids.length };
}
```

```ts
// src/features/attempts/start-exam.ts
import type { PrismaClient } from "@prisma/client";

export type StartExamDb = Pick<PrismaClient, "exam" | "examQuestion" | "attempt" | "attemptAnswer">;

export async function startExam(db: StartExamDb, p: { userId: string; examId: string }): Promise<{ attemptId: string }> {
  const exam = await db.exam.findUnique({ where: { id: p.examId } });
  if (!exam || exam.status !== "PUBLISHED") throw new Error("NOT_FOUND");

  const items = await db.examQuestion.findMany({ where: { examId: exam.id }, orderBy: { order: "asc" }, select: { questionId: true, order: true } });
  const attempt = await db.attempt.create({ data: { userId: p.userId, certificate: exam.certificate, type: "EXAM", examId: exam.id } });
  await db.attemptAnswer.createMany({ data: items.map((it) => ({ attemptId: attempt.id, questionId: it.questionId, order: it.order })) });
  return { attemptId: attempt.id };
}
```

```ts
// src/features/attempts/get-attempt.ts
import type { PrismaClient } from "@prisma/client";
import { toClientQuestion, type QuestionForClient } from "@/features/questions/dto";
import { loadOwnedAttempt } from "./load-owned";

export type GetAttemptDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type AttemptConfig = { section?: string; skillTags?: string[]; count?: number };

export type AttemptForClient = {
  id: string;
  type: "EXAM" | "DRILL";
  certificate: string;
  examId: string | null;
  startedAt: string;
  submittedAt: string | null;
  config: AttemptConfig | null;
  questions: QuestionForClient[];
};

export async function getAttemptForUser(db: GetAttemptDb, p: { attemptId: string; userId: string }): Promise<AttemptForClient> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  const rows = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    orderBy: { order: "asc" },
    include: { question: { include: { group: true } } },
  });
  return {
    id: attempt.id,
    type: attempt.type,
    certificate: attempt.certificate,
    examId: attempt.examId,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    config: (attempt.config as AttemptConfig | null) ?? null,
    questions: rows.map((r) => toClientQuestion(r.question, r.order, r.chosen)),
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- src/features/attempts`
Expected: PASS 7 test.

- [ ] **Step 5: Commit**

```bash
git add src/features/attempts
git commit -m "feat: bắt đầu drill, bắt đầu thi, nạp lượt làm bài"
```

---

### Task 6: Trả lời drill, lưu đáp án thi, nộp bài và chấm điểm, lấy kết quả

**Files:**
- Create: `src/features/attempts/answer-drill.ts`
- Create: `src/features/attempts/save-exam-answers.ts`
- Create: `src/features/attempts/submit.ts`
- Create: `src/features/attempts/get-result.ts`
- Test: `src/features/attempts/answer-drill.test.ts`, `src/features/attempts/save-exam-answers.test.ts`, `src/features/attempts/submit.test.ts`, `src/features/attempts/get-result.test.ts`

**Interfaces:**
- Consumes: `loadOwnedAttempt` (Task 5), `toClientQuestion` (Task 4), `getCertificate`, `getSection`, `ScoreResult` (Task 1).
- Produces:
  - `type AnswerDrillDb = Pick<PrismaClient, "attempt" | "attemptAnswer">`; `answerDrillQuestion(db, p: { attemptId; userId; questionId; chosen: number }): Promise<{ isCorrect: boolean; answer: number; explanation: string }>` — ném `WRONG_TYPE` (không phải DRILL), `ALREADY_SUBMITTED`, `NOT_FOUND` (câu không thuộc attempt), `INVALID` (chosen ngoài khoảng).
  - `type SaveAnswersDb = Pick<PrismaClient, "attempt" | "attemptAnswer">`; `saveExamAnswers(db, p: { attemptId; userId; answers: { questionId: string; chosen: number | null }[] }): Promise<{ saved: number }>` — ném `WRONG_TYPE` (không phải EXAM), `ALREADY_SUBMITTED`.
  - `type SubmitDb = Pick<PrismaClient, "attempt" | "attemptAnswer">`; `submitAttempt(db, p: { attemptId; userId; now?: Date }): Promise<{ correct: number; total: number; scores: ScoreResult | null; overtime: boolean }>` — ném `ALREADY_SUBMITTED`. EXAM: `scores` từ `CertificateSpec.score`, `overtime` khi `now - startedAt > (listening + reading + 2) phút`. DRILL: `scores = null`, `overtime = false`.
  - `type AttemptResult = { id; type; certificate; examId; startedAt: string; submittedAt: string; overtime: boolean; scores: ScoreResult | null; correct: number; total: number; bySection: { section: string; name: string; correct: number; total: number }[]; questions: (QuestionForClient & { answer: number; explanation: string; isCorrect: boolean | null })[] }`
  - `type ResultDb = Pick<PrismaClient, "attempt" | "attemptAnswer">`; `getAttemptResult(db, p: { attemptId; userId }): Promise<AttemptResult>` — ném `NOT_SUBMITTED` nếu chưa nộp.

- [ ] **Step 1: Viết test**

```ts
// src/features/attempts/answer-drill.test.ts
import { describe, it, expect, vi } from "vitest";
import { answerDrillQuestion, type AnswerDrillDb } from "./answer-drill";

function fakeDb(attempt: Record<string, unknown> | null, row: Record<string, unknown> | null) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: { findUnique: vi.fn(async () => row), update: vi.fn(async () => ({})) },
  };
  return { db: db as unknown as AnswerDrillDb, raw: db };
}
const drill = { id: "a1", userId: "u1", type: "DRILL", submittedAt: null };
const row = { id: "aa1", attemptId: "a1", questionId: "q1", chosen: null, question: { answer: 2, explanation: "Vì X", choices: ["a", "b", "c", "d"] } };

describe("answerDrillQuestion", () => {
  it("ghi chosen + isCorrect và trả đáp án, giải thích", async () => {
    const { db, raw } = fakeDb(drill, row);
    const r = await answerDrillQuestion(db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 2 });
    expect(r).toEqual({ isCorrect: true, answer: 2, explanation: "Vì X" });
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "aa1" }, data: { chosen: 2, isCorrect: true } });
  });

  it("chọn sai → isCorrect false", async () => {
    const { db } = fakeDb(drill, row);
    const r = await answerDrillQuestion(db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 0 });
    expect(r.isCorrect).toBe(false);
  });

  it("chosen ngoài khoảng → INVALID", async () => {
    const { db } = fakeDb(drill, row);
    await expect(answerDrillQuestion(db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 4 })).rejects.toThrow("INVALID");
  });

  it("attempt EXAM → WRONG_TYPE; đã nộp → ALREADY_SUBMITTED; câu lạ → NOT_FOUND", async () => {
    await expect(answerDrillQuestion(fakeDb({ ...drill, type: "EXAM" }, row).db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 0 })).rejects.toThrow("WRONG_TYPE");
    await expect(answerDrillQuestion(fakeDb({ ...drill, submittedAt: new Date() }, row).db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 0 })).rejects.toThrow("ALREADY_SUBMITTED");
    await expect(answerDrillQuestion(fakeDb(drill, null).db, { attemptId: "a1", userId: "u1", questionId: "zz", chosen: 0 })).rejects.toThrow("NOT_FOUND");
  });
});
```

```ts
// src/features/attempts/save-exam-answers.test.ts
import { describe, it, expect, vi } from "vitest";
import { saveExamAnswers, type SaveAnswersDb } from "./save-exam-answers";

function fakeDb(attempt: Record<string, unknown>) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  return { db: db as unknown as SaveAnswersDb, raw: db };
}
const exam = { id: "a1", userId: "u1", type: "EXAM", submittedAt: null };

describe("saveExamAnswers", () => {
  it("cập nhật chosen theo từng câu, đếm số dòng đã lưu", async () => {
    const { db, raw } = fakeDb(exam);
    const r = await saveExamAnswers(db, { attemptId: "a1", userId: "u1", answers: [{ questionId: "q1", chosen: 1 }, { questionId: "q2", chosen: null }] });
    expect(r).toEqual({ saved: 2 });
    expect(raw.attemptAnswer.updateMany).toHaveBeenNthCalledWith(1, { where: { attemptId: "a1", questionId: "q1" }, data: { chosen: 1 } });
    expect(raw.attemptAnswer.updateMany).toHaveBeenNthCalledWith(2, { where: { attemptId: "a1", questionId: "q2" }, data: { chosen: null } });
  });

  it("DRILL → WRONG_TYPE; đã nộp → ALREADY_SUBMITTED", async () => {
    await expect(saveExamAnswers(fakeDb({ ...exam, type: "DRILL" }).db, { attemptId: "a1", userId: "u1", answers: [] })).rejects.toThrow("WRONG_TYPE");
    await expect(saveExamAnswers(fakeDb({ ...exam, submittedAt: new Date() }).db, { attemptId: "a1", userId: "u1", answers: [] })).rejects.toThrow("ALREADY_SUBMITTED");
  });
});
```

```ts
// src/features/attempts/submit.test.ts
import { describe, it, expect, vi } from "vitest";
import { submitAttempt, type SubmitDb } from "./submit";

type Row = { id: string; chosen: number | null; isCorrect: boolean | null; question: { answer: number; section: string } };

function fakeDb(attempt: Record<string, unknown>, rows: Row[]) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt), update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...attempt, ...data })) },
    attemptAnswer: { findMany: vi.fn(async () => rows), update: vi.fn(async () => ({})) },
  };
  return { db: db as unknown as SubmitDb, raw: db };
}

const started = new Date("2026-09-05T08:00:00Z");
const rows: Row[] = [
  { id: "r1", chosen: 1, isCorrect: null, question: { answer: 1, section: "toeic.p5" } },
  { id: "r2", chosen: 0, isCorrect: null, question: { answer: 1, section: "toeic.p5" } },
  { id: "r3", chosen: null, isCorrect: null, question: { answer: 2, section: "toeic.p7" } },
  { id: "r4", chosen: 2, isCorrect: null, question: { answer: 2, section: "toeic.p7" } },
];

describe("submitAttempt", () => {
  it("EXAM: chấm từng câu, tính điểm theo CertificateSpec, không overtime khi nộp đúng giờ", async () => {
    const { db, raw } = fakeDb({ id: "a1", userId: "u1", type: "EXAM", certificate: "toeic", startedAt: started, submittedAt: null }, rows);
    const now = new Date("2026-09-05T09:59:00Z"); // 119 phút
    const r = await submitAttempt(db, { attemptId: "a1", userId: "u1", now });
    expect(r.correct).toBe(2);
    expect(r.total).toBe(4);
    expect(r.overtime).toBe(false);
    expect(r.scores).toEqual({ parts: { listening: 5, reading: 5 }, total: 10 }); // 2 câu đúng reading → 5
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { isCorrect: true } });
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "r2" }, data: { isCorrect: false } });
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "r3" }, data: { isCorrect: null } });
    expect(raw.attempt.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { submittedAt: now, overtime: false, scores: { parts: { listening: 5, reading: 5 }, total: 10 } },
    });
  });

  it("EXAM: quá 45 + 75 + 2 phút → overtime true nhưng vẫn chấm", async () => {
    const { db } = fakeDb({ id: "a1", userId: "u1", type: "EXAM", certificate: "toeic", startedAt: started, submittedAt: null }, rows);
    const r = await submitAttempt(db, { attemptId: "a1", userId: "u1", now: new Date("2026-09-05T10:03:00Z") }); // 123 phút
    expect(r.overtime).toBe(true);
    expect(r.correct).toBe(2);
  });

  it("DRILL: scores null, overtime false", async () => {
    const { db, raw } = fakeDb({ id: "a1", userId: "u1", type: "DRILL", certificate: "toeic", startedAt: started, submittedAt: null }, rows);
    const now = new Date();
    const r = await submitAttempt(db, { attemptId: "a1", userId: "u1", now });
    expect(r).toEqual({ correct: 2, total: 4, scores: null, overtime: false });
    expect(raw.attempt.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { submittedAt: now, overtime: false, scores: undefined } });
  });

  it("đã nộp → ALREADY_SUBMITTED", async () => {
    const { db } = fakeDb({ id: "a1", userId: "u1", type: "DRILL", certificate: "toeic", startedAt: started, submittedAt: new Date() }, rows);
    await expect(submitAttempt(db, { attemptId: "a1", userId: "u1" })).rejects.toThrow("ALREADY_SUBMITTED");
  });
});
```

```ts
// src/features/attempts/get-result.test.ts
import { describe, it, expect, vi } from "vitest";
import { getAttemptResult, type ResultDb } from "./get-result";

const q = (id: string, section: string, answer: number) => ({
  id, certificate: "toeic", section, status: "PUBLISHED", groupId: null, stem: "S", choices: ["a", "b", "c", "d"], answer, explanation: `E${id}`,
  skillTags: [], audioUrl: null, imageUrl: null, transcript: null, source: "IMPORT", createdAt: new Date(), updatedAt: new Date(), group: null,
});

function fakeDb(attempt: Record<string, unknown> | null) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: {
      findMany: vi.fn(async () => [
        { id: "r1", attemptId: "a1", questionId: "q1", order: 1, chosen: 1, isCorrect: true, question: q("q1", "toeic.p5", 1) },
        { id: "r2", attemptId: "a1", questionId: "q2", order: 2, chosen: 0, isCorrect: false, question: q("q2", "toeic.p5", 1) },
        { id: "r3", attemptId: "a1", questionId: "q3", order: 3, chosen: null, isCorrect: null, question: q("q3", "toeic.p7", 2) },
      ]),
    },
  };
  return db as unknown as ResultDb;
}

const base = { id: "a1", userId: "u1", type: "EXAM", certificate: "toeic", examId: "e1", startedAt: new Date("2026-09-05T08:00:00Z"), submittedAt: new Date("2026-09-05T09:00:00Z"), overtime: false, scores: { parts: { listening: 5, reading: 5 }, total: 10 }, config: null };

describe("getAttemptResult", () => {
  it("trả điểm, tổng đúng, thống kê theo section có tên, và câu kèm đáp án + giải thích", async () => {
    const r = await getAttemptResult(fakeDb(base), { attemptId: "a1", userId: "u1" });
    expect(r.correct).toBe(1);
    expect(r.total).toBe(3);
    expect(r.scores?.total).toBe(10);
    expect(r.bySection).toEqual([
      { section: "toeic.p5", name: "Part 5 – Hoàn thành câu", correct: 1, total: 2 },
      { section: "toeic.p7", name: "Part 7 – Đọc hiểu", correct: 0, total: 1 },
    ]);
    expect(r.questions[1]).toMatchObject({ id: "q2", chosen: 0, answer: 1, explanation: "Eq2", isCorrect: false });
    expect(r.submittedAt).toBe("2026-09-05T09:00:00.000Z");
  });

  it("chưa nộp → NOT_SUBMITTED", async () => {
    await expect(getAttemptResult(fakeDb({ ...base, submittedAt: null }), { attemptId: "a1", userId: "u1" })).rejects.toThrow("NOT_SUBMITTED");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/features/attempts`
Expected: 4 file mới FAIL vì thiếu module; 3 file Task 5 vẫn pass.

- [ ] **Step 3: Viết code**

```ts
// src/features/attempts/answer-drill.ts
import type { PrismaClient } from "@prisma/client";
import { loadOwnedAttempt } from "./load-owned";

export type AnswerDrillDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type AnswerDrillParams = { attemptId: string; userId: string; questionId: string; chosen: number };

export async function answerDrillQuestion(db: AnswerDrillDb, p: AnswerDrillParams): Promise<{ isCorrect: boolean; answer: number; explanation: string }> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (attempt.type !== "DRILL") throw new Error("WRONG_TYPE");
  if (attempt.submittedAt) throw new Error("ALREADY_SUBMITTED");

  const row = await db.attemptAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: p.attemptId, questionId: p.questionId } },
    include: { question: { select: { answer: true, explanation: true, choices: true } } },
  });
  if (!row) throw new Error("NOT_FOUND");
  const choices = row.question.choices as string[];
  if (!Number.isInteger(p.chosen) || p.chosen < 0 || p.chosen >= choices.length) throw new Error("INVALID");

  const isCorrect = row.question.answer === p.chosen;
  await db.attemptAnswer.update({ where: { id: row.id }, data: { chosen: p.chosen, isCorrect } });
  return { isCorrect, answer: row.question.answer, explanation: row.question.explanation };
}
```

```ts
// src/features/attempts/save-exam-answers.ts
import type { PrismaClient } from "@prisma/client";
import { loadOwnedAttempt } from "./load-owned";

export type SaveAnswersDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type SaveAnswersParams = { attemptId: string; userId: string; answers: { questionId: string; chosen: number | null }[] };

/** Đồng bộ đáp án thi (gọi định kỳ và trước khi nộp). Không chấm ở đây; chấm khi nộp. */
export async function saveExamAnswers(db: SaveAnswersDb, p: SaveAnswersParams): Promise<{ saved: number }> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (attempt.type !== "EXAM") throw new Error("WRONG_TYPE");
  if (attempt.submittedAt) throw new Error("ALREADY_SUBMITTED");

  let saved = 0;
  for (const a of p.answers) {
    const r = await db.attemptAnswer.updateMany({ where: { attemptId: p.attemptId, questionId: a.questionId }, data: { chosen: a.chosen } });
    saved += r.count;
  }
  return { saved };
}
```

```ts
// src/features/attempts/submit.ts
import type { PrismaClient } from "@prisma/client";
import { getCertificate, type ScoreResult } from "@/features/certificates";
import { loadOwnedAttempt } from "./load-owned";

export type SubmitDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type SubmitResult = { correct: number; total: number; scores: ScoreResult | null; overtime: boolean };

const GRACE_MINUTES = 2;

export async function submitAttempt(db: SubmitDb, p: { attemptId: string; userId: string; now?: Date }): Promise<SubmitResult> {
  const now = p.now ?? new Date();
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (attempt.submittedAt) throw new Error("ALREADY_SUBMITTED");

  const rows = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    include: { question: { select: { answer: true, section: true } } },
  });

  const correctBySection: Record<string, number> = {};
  let correct = 0;
  for (const r of rows) {
    const isCorrect = r.chosen === null ? null : r.chosen === r.question.answer;
    if (isCorrect) {
      correct++;
      correctBySection[r.question.section] = (correctBySection[r.question.section] ?? 0) + 1;
    }
    await db.attemptAnswer.update({ where: { id: r.id }, data: { isCorrect } });
  }

  let scores: ScoreResult | null = null;
  let overtime = false;
  if (attempt.type === "EXAM") {
    const cert = getCertificate(attempt.certificate);
    scores = cert.score(correctBySection);
    const limitMs = (cert.timeLimits.listening + cert.timeLimits.reading + GRACE_MINUTES) * 60_000;
    overtime = now.getTime() - attempt.startedAt.getTime() > limitMs;
  }

  await db.attempt.update({ where: { id: attempt.id }, data: { submittedAt: now, overtime, scores: scores ?? undefined } });
  return { correct, total: rows.length, scores, overtime };
}
```

```ts
// src/features/attempts/get-result.ts
import type { PrismaClient } from "@prisma/client";
import { getCertificate, type ScoreResult } from "@/features/certificates";
import { toClientQuestion, type QuestionForClient } from "@/features/questions/dto";
import { loadOwnedAttempt } from "./load-owned";

export type ResultDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type ResultQuestion = QuestionForClient & { answer: number; explanation: string; isCorrect: boolean | null };

export type AttemptResult = {
  id: string;
  type: "EXAM" | "DRILL";
  certificate: string;
  examId: string | null;
  startedAt: string;
  submittedAt: string;
  overtime: boolean;
  scores: ScoreResult | null;
  correct: number;
  total: number;
  bySection: { section: string; name: string; correct: number; total: number }[];
  questions: ResultQuestion[];
};

export async function getAttemptResult(db: ResultDb, p: { attemptId: string; userId: string }): Promise<AttemptResult> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (!attempt.submittedAt) throw new Error("NOT_SUBMITTED");
  const cert = getCertificate(attempt.certificate);

  const rows = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    orderBy: { order: "asc" },
    include: { question: { include: { group: true } } },
  });

  const bySectionMap = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  const questions: ResultQuestion[] = rows.map((r) => {
    const s = bySectionMap.get(r.question.section) ?? { correct: 0, total: 0 };
    s.total++;
    if (r.isCorrect) {
      s.correct++;
      correct++;
    }
    bySectionMap.set(r.question.section, s);
    return { ...toClientQuestion(r.question, r.order, r.chosen), answer: r.question.answer, explanation: r.question.explanation, isCorrect: r.isCorrect };
  });

  const bySection = cert.sections
    .filter((s) => bySectionMap.has(s.id))
    .map((s) => ({ section: s.id, name: s.name, ...bySectionMap.get(s.id)! }));

  return {
    id: attempt.id,
    type: attempt.type,
    certificate: attempt.certificate,
    examId: attempt.examId,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt.toISOString(),
    overtime: attempt.overtime,
    scores: (attempt.scores as ScoreResult | null) ?? null,
    correct,
    total: rows.length,
    bySection,
    questions,
  };
}
```

- [ ] **Step 4: Chạy test, typecheck**

Run: `npm test -- src/features/attempts && npm run typecheck`
Expected: PASS toàn bộ (7 test cũ + 11 test mới), 0 lỗi kiểu.

- [ ] **Step 5: Commit**

```bash
git add src/features/attempts
git commit -m "feat: trả lời drill, lưu đáp án thi, nộp bài chấm điểm, lấy kết quả"
```

---

### Task 7: Map mã lỗi sang HTTP và 5 route handler

**Files:**
- Create: `src/lib/api-errors.ts`
- Create: `src/app/api/drill/start/route.ts`
- Create: `src/app/api/exam/[examId]/start/route.ts`
- Create: `src/app/api/attempts/[attemptId]/answer/route.ts`
- Create: `src/app/api/attempts/[attemptId]/answers/route.ts`
- Create: `src/app/api/attempts/[attemptId]/submit/route.ts`
- Test: `src/lib/api-errors.test.ts`, `src/app/api/drill/start/route.test.ts`, `src/app/api/attempts/[attemptId]/submit/route.test.ts`

**Interfaces:**
- Consumes: `startDrill`, `startExam`, `answerDrillQuestion`, `saveExamAnswers`, `submitAttempt` (Task 5–6).
- Produces:
  - `errorToResponse(e: unknown): NextResponse | null` — trả response JSON `{ error: "<MÃ>" }` với status theo bảng; `null` nếu không phải mã lỗi đã biết (route sẽ `throw e`).
  - `POST /api/drill/start` body `{ section: string; skillTags?: string[]; count: 10 | 20 | 30 }` → `200 { attemptId, count }`.
  - `POST /api/exam/[examId]/start` → `200 { attemptId }`.
  - `POST /api/attempts/[attemptId]/answer` body `{ questionId: string; chosen: number }` → `200 { isCorrect, answer, explanation }`.
  - `PUT /api/attempts/[attemptId]/answers` body `{ answers: { questionId: string; chosen: number | null }[] }` → `200 { saved }`.
  - `POST /api/attempts/[attemptId]/submit` body tùy chọn `{ answers?: {...}[] }` (thi: lưu trước rồi nộp) → `200 { correct, total, scores, overtime }`.

- [ ] **Step 1: Viết test**

```ts
// src/lib/api-errors.test.ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { errorToResponse } from "./api-errors";

describe("errorToResponse", () => {
  it.each([
    ["UNAUTHORIZED", 401], ["FORBIDDEN", 403], ["NOT_FOUND", 404], ["ALREADY_SUBMITTED", 409],
    ["NOT_ENOUGH_QUESTIONS", 409], ["NOT_SUBMITTED", 409], ["INVALID", 400], ["WRONG_TYPE", 400],
  ])("%s → %i", async (code, status) => {
    const r = errorToResponse(new Error(code));
    expect(r?.status).toBe(status);
    expect(await r!.json()).toEqual({ error: code });
  });

  it("lỗi lạ → null", () => {
    expect(errorToResponse(new Error("boom"))).toBeNull();
    expect(errorToResponse("x")).toBeNull();
  });
});
```

```ts
// src/app/api/drill/start/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, startDrillMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string } } | null> => ({ user: { id: "u1" } })),
  startDrillMock: vi.fn(async () => ({ attemptId: "a1", count: 10 })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/attempts/start-drill", () => ({ startDrill: startDrillMock }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/drill/start", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/drill/start", () => {
  it("chưa đăng nhập → 401", async () => {
    authMock.mockResolvedValueOnce(null);
    expect((await POST(req({ section: "toeic.p5", count: 10 }))).status).toBe(401);
  });

  it("count không thuộc 10/20/30 → 400 INVALID", async () => {
    const res = await POST(req({ section: "toeic.p5", count: 7 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });

  it("hợp lệ → gọi startDrill với certificate toeic, trả attemptId", async () => {
    const res = await POST(req({ section: "toeic.p5", count: 10, skillTags: ["grammar.tense"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ attemptId: "a1", count: 10 });
    expect(startDrillMock).toHaveBeenCalledWith({}, { userId: "u1", certificate: "toeic", section: "toeic.p5", skillTags: ["grammar.tense"], count: 10 });
  });

  it("NOT_ENOUGH_QUESTIONS → 409", async () => {
    startDrillMock.mockRejectedValueOnce(new Error("NOT_ENOUGH_QUESTIONS"));
    const res = await POST(req({ section: "toeic.p1", count: 10 }));
    expect(res.status).toBe(409);
  });
});
```

```ts
// src/app/api/attempts/[attemptId]/submit/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, saveMock, submitMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string } } | null> => ({ user: { id: "u1" } })),
  saveMock: vi.fn(async () => ({ saved: 1 })),
  submitMock: vi.fn(async () => ({ correct: 1, total: 2, scores: null, overtime: false })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/attempts/save-exam-answers", () => ({ saveExamAnswers: saveMock }));
vi.mock("@/features/attempts/submit", () => ({ submitAttempt: submitMock }));

import { POST } from "./route";

const params = Promise.resolve({ attemptId: "a1" });
function req(body?: unknown) {
  return new Request("http://x/api/attempts/a1/submit", { method: "POST", body: body === undefined ? null : JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/attempts/[attemptId]/submit", () => {
  it("không body → chỉ nộp", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(saveMock).not.toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledWith({}, { attemptId: "a1", userId: "u1" });
  });

  it("có answers → lưu trước rồi nộp", async () => {
    const res = await POST(req({ answers: [{ questionId: "q1", chosen: 2 }] }), { params });
    expect(res.status).toBe(200);
    expect(saveMock).toHaveBeenCalledWith({}, { attemptId: "a1", userId: "u1", answers: [{ questionId: "q1", chosen: 2 }] });
    expect(submitMock).toHaveBeenCalled();
  });

  it("ALREADY_SUBMITTED → 409", async () => {
    submitMock.mockRejectedValueOnce(new Error("ALREADY_SUBMITTED"));
    expect((await POST(req(), { params })).status).toBe(409);
  });

  it("chưa đăng nhập → 401", async () => {
    authMock.mockResolvedValueOnce(null);
    expect((await POST(req(), { params })).status).toBe(401);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/lib/api-errors.test.ts src/app/api/drill src/app/api/attempts`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết code**

```ts
// src/lib/api-errors.ts
import { NextResponse } from "next/server";

const STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ALREADY_SUBMITTED: 409,
  NOT_ENOUGH_QUESTIONS: 409,
  NOT_SUBMITTED: 409,
  INVALID: 400,
  WRONG_TYPE: 400,
};

/** Đổi Error("MÃ") của lớp nghiệp vụ thành response JSON. Trả null nếu không phải mã đã biết. */
export function errorToResponse(e: unknown): NextResponse | null {
  if (e instanceof Error && e.message in STATUS) {
    return NextResponse.json({ error: e.message }, { status: STATUS[e.message] });
  }
  return null;
}
```

```ts
// src/app/api/drill/start/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { startDrill } from "@/features/attempts/start-drill";

const bodySchema = z.object({
  section: z.string().min(1),
  skillTags: z.array(z.string().min(1)).max(10).optional(),
  count: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await startDrill(prisma, { userId: session.user.id, certificate: "toeic", ...parsed.data });
    return NextResponse.json(r);
  } catch (e) {
    return errorToResponse(e) ?? Promise.reject(e);
  }
}
```

```ts
// src/app/api/exam/[examId]/start/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { startExam } from "@/features/attempts/start-exam";

export async function POST(_req: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { examId } = await params;
  try {
    return NextResponse.json(await startExam(prisma, { userId: session.user.id, examId }));
  } catch (e) {
    return errorToResponse(e) ?? Promise.reject(e);
  }
}
```

```ts
// src/app/api/attempts/[attemptId]/answer/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { answerDrillQuestion } from "@/features/attempts/answer-drill";

const bodySchema = z.object({ questionId: z.string().min(1), chosen: z.number().int().min(0).max(3) });

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const { attemptId } = await params;
  try {
    return NextResponse.json(await answerDrillQuestion(prisma, { attemptId, userId: session.user.id, ...parsed.data }));
  } catch (e) {
    return errorToResponse(e) ?? Promise.reject(e);
  }
}
```

```ts
// src/app/api/attempts/[attemptId]/answers/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { saveExamAnswers } from "@/features/attempts/save-exam-answers";

export const answersSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), chosen: z.number().int().min(0).max(3).nullable() })).max(300),
});

export async function PUT(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = answersSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const { attemptId } = await params;
  try {
    return NextResponse.json(await saveExamAnswers(prisma, { attemptId, userId: session.user.id, answers: parsed.data.answers }));
  } catch (e) {
    return errorToResponse(e) ?? Promise.reject(e);
  }
}
```

```ts
// src/app/api/attempts/[attemptId]/submit/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { saveExamAnswers } from "@/features/attempts/save-exam-answers";
import { submitAttempt } from "@/features/attempts/submit";

const bodySchema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), chosen: z.number().int().min(0).max(3).nullable() })).max(300).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const raw = await req.text();
  const parsed = bodySchema.safeParse(raw ? JSON.parse(raw) : {});
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const { attemptId } = await params;
  const userId = session.user.id;
  try {
    if (parsed.data.answers) await saveExamAnswers(prisma, { attemptId, userId, answers: parsed.data.answers });
    return NextResponse.json(await submitAttempt(prisma, { attemptId, userId }));
  } catch (e) {
    return errorToResponse(e) ?? Promise.reject(e);
  }
}
```

Ghi chú: `return errorToResponse(e) ?? Promise.reject(e)` trả response nếu là mã đã biết, còn không thì ném lại lỗi gốc (Next trả 500). Nếu ESLint phàn nàn, viết dài: `const r = errorToResponse(e); if (r) return r; throw e;`.

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `npm test -- src/lib/api-errors.test.ts src/app/api && npm run typecheck && npm run lint`
Expected: PASS toàn bộ, 0 lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-errors.ts src/lib/api-errors.test.ts src/app/api/drill src/app/api/exam src/app/api/attempts
git commit -m "feat: API bắt đầu drill/thi, trả lời, đồng bộ đáp án, nộp bài"
```

---

### Task 8: Giao diện luyện tập (drill): form chọn, thẻ câu hỏi, chạy drill

**Files:**
- Create: `src/components/questions/AudioOnce.tsx`
- Create: `src/components/questions/QuestionCard.tsx`
- Create: `src/components/drill/DrillSetupForm.tsx`
- Create: `src/components/drill/DrillRunner.tsx`
- Modify: `src/app/drill/page.tsx` (thay `ComingSoon`)
- Create: `src/app/drill/[attemptId]/page.tsx`
- Test: `src/components/questions/QuestionCard.test.tsx`, `src/components/drill/DrillSetupForm.test.tsx`, `src/components/drill/DrillRunner.test.tsx`

**Interfaces:**
- Consumes: `QuestionForClient` (Task 4), `AttemptForClient`, `getAttemptForUser` (Task 5), `TOEIC` (Task 1), API Task 7.
- Produces:
  - `<AudioOnce src autoPlay? onEnded? />` — phát một lần, không có thanh tua; nút `aria-label="Phát audio"`; sau khi phát xong hiện "Đã phát" và nút bị disabled.
  - `<QuestionCard q index selected onSelect? disabled? reveal? autoPlayAudio? />` với `reveal?: { answer: number; explanation: string } | null`. Lựa chọn là `<button role="radio" aria-checked>` nhãn `A.`/`B.`/`C.`/`D.` + nội dung.
  - `<DrillSetupForm sections={{ id, name }[]} />` — POST `/api/drill/start`, chuyển `/drill/<attemptId>`.
  - `<DrillRunner attempt={AttemptForClient} />`.

- [ ] **Step 1: Viết test**

```tsx
// src/components/questions/QuestionCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionCard } from "./QuestionCard";
import type { QuestionForClient } from "@/features/questions/dto";

const q: QuestionForClient = {
  id: "q1", section: "toeic.p6", order: 1, stem: "(131)", choices: ["through", "until", "by", "at"], audioUrl: null, imageUrl: null,
  group: { id: "g1", passage: "Dear all,\nParking closed.", audioUrl: null, imageUrl: null }, chosen: null,
};

describe("QuestionCard", () => {
  it("hiện đoạn văn, stem và 4 lựa chọn có nhãn A–D; chọn thì gọi onSelect", async () => {
    const onSelect = vi.fn();
    render(<QuestionCard q={q} index={1} selected={null} onSelect={onSelect} />);
    expect(screen.getByText(/Parking closed/)).toBeInTheDocument();
    expect(screen.getByText("(131)")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    await userEvent.click(screen.getByRole("radio", { name: /B\.\s*until/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("đánh dấu lựa chọn đang chọn bằng aria-checked", () => {
    render(<QuestionCard q={q} index={1} selected={2} onSelect={() => {}} />);
    expect(screen.getByRole("radio", { name: /C\.\s*by/ })).toHaveAttribute("aria-checked", "true");
  });

  it("khi reveal: hiện giải thích, đáp án đúng có data-state=correct, chọn sai có data-state=wrong, không chọn được nữa", async () => {
    const onSelect = vi.fn();
    render(<QuestionCard q={q} index={1} selected={1} onSelect={onSelect} reveal={{ answer: 0, explanation: "Vì from...through" }} />);
    expect(screen.getByText("Vì from...through")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /A\./ })).toHaveAttribute("data-state", "correct");
    expect(screen.getByRole("radio", { name: /B\./ })).toHaveAttribute("data-state", "wrong");
    await userEvent.click(screen.getByRole("radio", { name: /C\./ }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

```tsx
// src/components/drill/DrillSetupForm.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrillSetupForm } from "./DrillSetupForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const sections = [{ id: "toeic.p5", name: "Part 5 – Hoàn thành câu" }, { id: "toeic.p7", name: "Part 7 – Đọc hiểu" }];

describe("DrillSetupForm", () => {
  beforeEach(() => { push.mockReset(); vi.restoreAllMocks(); });

  it("gửi section và count đã chọn rồi chuyển sang trang drill", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ attemptId: "a1", count: 10 }), { status: 200 }));
    render(<DrillSetupForm sections={sections} />);
    await userEvent.click(screen.getByRole("radio", { name: /Part 7/ }));
    await userEvent.click(screen.getByRole("radio", { name: "20 câu" }));
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/drill/a1"));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ section: "toeic.p7", count: 20 });
  });

  it("NOT_ENOUGH_QUESTIONS → báo chưa có câu hỏi", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "NOT_ENOUGH_QUESTIONS" }), { status: 409 }));
    render(<DrillSetupForm sections={sections} />);
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    expect(await screen.findByText(/chưa có câu hỏi/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
```

```tsx
// src/components/drill/DrillRunner.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrillRunner } from "./DrillRunner";
import type { AttemptForClient } from "@/features/attempts/get-attempt";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const attempt: AttemptForClient = {
  id: "a1", type: "DRILL", certificate: "toeic", examId: null, startedAt: "2026-09-05T08:00:00.000Z", submittedAt: null,
  config: { section: "toeic.p5", count: 2 },
  questions: [
    { id: "q1", section: "toeic.p5", order: 1, stem: "Q1", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: null },
    { id: "q2", section: "toeic.p5", order: 2, stem: "Q2", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: null },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("DrillRunner", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("chọn đáp án → gọi API → hiện giải thích → câu tiếp → hết thì nộp và hiện tổng kết", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ isCorrect: true, answer: 1, explanation: "GT1" }))
      .mockResolvedValueOnce(json({ isCorrect: false, answer: 0, explanation: "GT2" }))
      .mockResolvedValueOnce(json({ correct: 1, total: 2, scores: null, overtime: false }));
    render(<DrillRunner attempt={attempt} />);

    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Câu 1/2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /B\./ }));
    expect(await screen.findByText("GT1")).toBeInTheDocument();
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ questionId: "q1", chosen: 1 });

    await userEvent.click(screen.getByRole("button", { name: "Câu tiếp" }));
    expect(screen.getByText("Q2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /D\./ }));
    expect(await screen.findByText("GT2")).toBeInTheDocument();
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Xem kết quả" }));
    await waitFor(() => expect(screen.getByText("1/2")).toBeInTheDocument());
    expect(fetchMock.mock.calls[2][0]).toBe("/api/attempts/a1/submit");
    expect(screen.getByRole("link", { name: "Luyện tiếp" })).toHaveAttribute("href", "/drill");
    expect(screen.getByRole("link", { name: "Xem chi tiết" })).toHaveAttribute("href", "/attempts/a1/result");
  });

  it("bắt đầu từ câu đầu chưa trả lời khi tải lại trang", () => {
    render(<DrillRunner attempt={{ ...attempt, questions: [{ ...attempt.questions[0], chosen: 2 }, attempt.questions[1]] }} />);
    expect(screen.getByText("Q2")).toBeInTheDocument();
    expect(screen.getByText("Câu 2/2")).toBeInTheDocument();
  });

  it("API lỗi → hiện thông báo và cho thử lại", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ error: "ALREADY_SUBMITTED" }, 409));
    render(<DrillRunner attempt={attempt} />);
    await userEvent.click(screen.getByRole("radio", { name: /A\./ }));
    expect(await screen.findByText(/không gửi được/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/components/questions src/components/drill`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết component**

```tsx
// src/components/questions/AudioOnce.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = { src: string; autoPlay?: boolean; onEnded?: () => void };

/** Phát audio đúng một lần, không cho tua lại (quy tắc phòng thi). */
export function AudioOnce({ src, autoPlay = false, onEnded }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");

  useEffect(() => {
    if (autoPlay && state === "idle") {
      ref.current?.play().then(() => setState("playing")).catch(() => {/* trình duyệt chặn autoplay: chờ người dùng bấm */});
    }
  }, [autoPlay, state]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
      <audio ref={ref} src={src} preload="auto" onEnded={() => { setState("done"); onEnded?.(); }} />
      <button
        type="button"
        aria-label="Phát audio"
        disabled={state !== "idle"}
        onClick={() => ref.current?.play().then(() => setState("playing"))}
        className="btn-neon rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
      >
        ▶ Phát
      </button>
      <span className="text-sm text-muted">
        {state === "idle" && "Audio chỉ phát một lần."}
        {state === "playing" && "Đang phát…"}
        {state === "done" && "Đã phát"}
      </span>
    </div>
  );
}
```

```tsx
// src/components/questions/QuestionCard.tsx
"use client";

import type { QuestionForClient } from "@/features/questions/dto";
import { AudioOnce } from "./AudioOnce";

const LABELS = ["A", "B", "C", "D"];

type Props = {
  q: QuestionForClient;
  index: number;
  selected: number | null;
  onSelect?: (i: number) => void;
  disabled?: boolean;
  reveal?: { answer: number; explanation: string } | null;
  autoPlayAudio?: boolean;
};

export function QuestionCard({ q, index, selected, onSelect, disabled, reveal, autoPlayAudio }: Props) {
  const locked = disabled || !!reveal;
  const audio = q.audioUrl ?? q.group?.audioUrl ?? null;
  const image = q.imageUrl ?? q.group?.imageUrl ?? null;

  const stateOf = (i: number): "correct" | "wrong" | "selected" | "idle" => {
    if (reveal) {
      if (i === reveal.answer) return "correct";
      if (i === selected) return "wrong";
      return "idle";
    }
    return i === selected ? "selected" : "idle";
  };

  const cls: Record<string, string> = {
    idle: "border-line hover:border-neon-violet/60 hover:bg-white/5",
    selected: "border-neon-violet bg-neon-violet/15",
    correct: "border-emerald-400 bg-emerald-400/15",
    wrong: "border-neon-pink bg-neon-pink/15",
  };

  return (
    <article className="card p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Câu số {index}</p>
      {q.group?.passage && (
        <div className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-4 text-sm leading-relaxed">{q.group.passage}</div>
      )}
      {image && <img src={image} alt="Hình của câu hỏi" className="mt-3 max-h-72 rounded-xl" />}
      {audio && <div className="mt-3"><AudioOnce src={audio} autoPlay={autoPlayAudio} /></div>}
      {q.stem && <p className="mt-4 text-lg font-semibold leading-relaxed">{q.stem}</p>}

      <div role="radiogroup" aria-label="Lựa chọn" className="mt-4 flex flex-col gap-2">
        {q.choices.map((c, i) => {
          const st = stateOf(i);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === selected}
              data-state={st}
              disabled={locked}
              onClick={() => !locked && onSelect?.(i)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${cls[st]}`}
            >
              <span className="font-bold text-neon-cyan">{LABELS[i]}.</span>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {reveal && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-sm">
          <p className="font-semibold">Đáp án: {LABELS[reveal.answer]}</p>
          <p className="mt-1 leading-relaxed text-foreground/90">{reveal.explanation}</p>
        </div>
      )}
    </article>
  );
}
```

```tsx
// src/components/drill/DrillSetupForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { sections: { id: string; name: string }[] };
const COUNTS = [10, 20, 30] as const;

export function DrillSetupForm({ sections }: Props) {
  const router = useRouter();
  const [section, setSection] = useState(sections[0]?.id ?? "");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/drill/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, count }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "NOT_ENOUGH_QUESTIONS" ? "Phần này chưa có câu hỏi. Hãy chọn phần khác." : "Không bắt đầu được, thử lại sau.");
        return;
      }
      router.push(`/drill/${data.attemptId}`);
    } catch {
      setError("Mất kết nối, thử lại sau.");
    } finally {
      setPending(false);
    }
  }

  const pill = (active: boolean) =>
    `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${active ? "border-neon-violet bg-neon-violet/15" : "border-line hover:bg-white/5"}`;

  return (
    <div className="card flex flex-col gap-6 p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-muted">Chọn phần</legend>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {sections.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={section === s.id} onClick={() => setSection(s.id)} className={pill(section === s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-muted">Số câu</legend>
        <div role="radiogroup" className="flex gap-2">
          {COUNTS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={count === c} aria-label={`${c} câu`} onClick={() => setCount(c)} className={pill(count === c)}>
              {c} câu
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-neon-pink">{error}</p>}
      <button type="button" onClick={start} disabled={pending || !section} className="btn-neon rounded-full px-6 py-3 font-bold disabled:opacity-50">
        Bắt đầu luyện
      </button>
    </div>
  );
}
```

```tsx
// src/components/drill/DrillRunner.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttemptForClient } from "@/features/attempts/get-attempt";
import { QuestionCard } from "@/components/questions/QuestionCard";

type Reveal = { isCorrect: boolean; answer: number; explanation: string };
type Summary = { correct: number; total: number };

export function DrillRunner({ attempt }: { attempt: AttemptForClient }) {
  const qs = attempt.questions;
  const firstUnanswered = Math.max(0, qs.findIndex((q) => q.chosen === null));
  const [idx, setIdx] = useState(qs.every((q) => q.chosen !== null) ? qs.length - 1 : firstUnanswered);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const q = qs[idx];
  const isLast = idx === qs.length - 1;

  async function choose(i: number) {
    if (reveal || pending) return;
    setSelected(i);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, chosen: i }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as Reveal;
      setReveal(data);
      if (data.isCorrect) setCorrectCount((n) => n + 1);
    } catch {
      setSelected(null);
      setError("Không gửi được câu trả lời. Hãy chọn lại.");
    } finally {
      setPending(false);
    }
  }

  function next() {
    setIdx((i) => i + 1);
    setSelected(null);
    setReveal(null);
  }

  async function finish() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, { method: "POST" });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as Summary;
      setSummary(data);
    } catch {
      setError("Không nộp được. Thử lại.");
    } finally {
      setPending(false);
    }
  }

  if (summary) {
    const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
    return (
      <section className="card relative mx-auto max-w-lg overflow-hidden p-8 text-center">
        <div className="glow -top-16 left-1/2 h-40 w-40 -translate-x-1/2 bg-neon-cyan" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted">Kết quả luyện tập</p>
          <p className="mt-3 text-6xl font-extrabold text-neon">{summary.correct}/{summary.total}</p>
          <p className="mt-2 text-muted">{pct >= 80 ? "Tuyệt vời! 🔥" : pct >= 50 ? "Khá ổn, tiếp tục nhé 💪" : "Xem lại giải thích rồi thử lại nào 📚"}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/drill" className="btn-neon rounded-full px-5 py-2 text-sm font-semibold">Luyện tiếp</Link>
            <Link href={`/attempts/${attempt.id}/result`} className="rounded-full border border-line px-5 py-2 text-sm font-semibold hover:bg-white/5">Xem chi tiết</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Câu {idx + 1}/{qs.length}</span>
        <span>Đúng: <span className="font-semibold text-emerald-300">{correctCount}</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-neon-violet to-neon-cyan transition-all" style={{ width: `${((idx + (reveal ? 1 : 0)) / qs.length) * 100}%` }} />
      </div>
      <QuestionCard q={q} index={idx + 1} selected={selected} onSelect={choose} disabled={pending} reveal={reveal ? { answer: reveal.answer, explanation: reveal.explanation } : null} />
      {reveal && (
        <p className={`text-center text-lg font-bold ${reveal.isCorrect ? "text-emerald-300" : "text-neon-pink"}`}>{reveal.isCorrect ? "Chính xác!" : "Chưa đúng"}</p>
      )}
      {error && <p className="text-center text-sm text-neon-pink">{error}</p>}
      <div className="flex justify-end">
        {reveal && !isLast && <button type="button" onClick={next} className="btn-neon rounded-full px-6 py-2.5 font-semibold">Câu tiếp</button>}
        {reveal && isLast && <button type="button" onClick={finish} disabled={pending} className="btn-neon rounded-full px-6 py-2.5 font-semibold disabled:opacity-50">Xem kết quả</button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test component, xác nhận pass**

Run: `npm test -- src/components/questions src/components/drill`
Expected: PASS 8 test.

- [ ] **Step 5: Trang `/drill` và `/drill/[attemptId]`**

```tsx
// src/app/drill/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TOEIC } from "@/features/certificates";
import { DrillSetupForm } from "@/components/drill/DrillSetupForm";

export const metadata: Metadata = { title: "Luyện tập" };

export default async function DrillPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">⚡ Luyện tập theo Part</h1>
        <p className="mt-2 text-muted">Chọn phần và số câu. Sau mỗi câu bạn thấy ngay đáp án và giải thích. Câu chưa làm và câu làm sai được ưu tiên.</p>
      </header>
      <DrillSetupForm sections={TOEIC.sections.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
```

```tsx
// src/app/drill/[attemptId]/page.tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttemptForUser, type AttemptForClient } from "@/features/attempts/get-attempt";
import { DrillRunner } from "@/components/drill/DrillRunner";

export const metadata: Metadata = { title: "Đang luyện tập" };

export default async function DrillAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { attemptId } = await params;

  let attempt: AttemptForClient;
  try {
    attempt = await getAttemptForUser(prisma, { attemptId, userId: session.user.id });
  } catch (e) {
    if (e instanceof Error && (e.message === "NOT_FOUND" || e.message === "FORBIDDEN")) notFound();
    throw e;
  }
  if (attempt.type !== "DRILL") redirect(`/exam/attempt/${attempt.id}`);
  if (attempt.submittedAt) redirect(`/attempts/${attempt.id}/result`);

  return <DrillRunner attempt={attempt} />;
}
```

- [ ] **Step 6: Kiểm tra bằng trình duyệt**

Chạy `npm run dev`, đăng nhập, mở `http://localhost:3000/drill`, chọn Part 5, 10 câu, bấm "Bắt đầu luyện". Mong đợi: 6 câu Part 5 mẫu hiện lần lượt, chọn đáp án thấy giải thích, hết thì hiện tổng kết. Chọn Part 1 phải báo "chưa có câu hỏi".

- [ ] **Step 7: typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/components/questions src/components/drill src/app/drill
git commit -m "feat: giao diện luyện tập theo Part với giải thích ngay"
```

---

### Task 9: Giao diện thi thử: danh sách đề, trang giới thiệu, đồng hồ, màn làm bài

**Files:**
- Modify: `src/app/exam/page.tsx` (thay `ComingSoon`)
- Create: `src/app/exam/[examId]/page.tsx`
- Create: `src/app/exam/attempt/[attemptId]/page.tsx`
- Create: `src/components/exam/ExamStartButton.tsx`
- Create: `src/components/exam/ExamTimer.tsx`
- Create: `src/components/exam/ExamRunner.tsx`
- Test: `src/components/exam/ExamTimer.test.tsx`, `src/components/exam/ExamRunner.test.tsx`

**Interfaces:**
- Consumes: `AttemptForClient` (Task 5), `QuestionCard`, `AudioOnce` (Task 8), `TOEIC`, `SectionSpec` (Task 1), API Task 7.
- Produces:
  - `<ExamTimer deadline={number} onExpire={() => void} />` — `deadline` là epoch ms; hiện `mm:ss` trong phần tử `role="timer"`; dưới 5 phút thêm class `text-neon-pink`; gọi `onExpire` đúng một lần khi hết giờ.
  - `<ExamRunner attempt sections timeLimits />` với `sections: SectionSpec[]`, `timeLimits: { listening: number; reading: number }`.
  - localStorage: `attempt:<id>:answers` (JSON `Record<questionId, number>`), `attempt:<id>:flags` (JSON `string[]`), `attempt:<id>:readingStartedAt` (epoch ms).

Cách chạy bài thi:
1. Phase **listening** nếu đề có câu thuộc section `skill === "listening"` và chưa có `readingStartedAt`. Câu nghe hiện lần lượt, audio tự phát một lần (`AudioOnce autoPlay`), nút "Câu tiếp"; câu cuối có nút "Chuyển sang phần đọc" → ghi `readingStartedAt = Date.now()`.
2. Phase **reading**: `readingStartedAt` mặc định = `attempt.startedAt` nếu đề không có câu nghe. Deadline = `readingStartedAt + timeLimits.reading` phút. Bảng số câu theo section để nhảy; nút "Đánh dấu xem lại" (cờ); Trước/Sau; nút "Nộp bài" hỏi `confirm`.
3. Mỗi lần chọn: ghi state + localStorage. Mỗi 30 giây `PUT /api/attempts/<id>/answers` với toàn bộ đáp án (đơn giản, tối đa 200 câu). Hết giờ hoặc bấm nộp: `POST /api/attempts/<id>/submit` với toàn bộ đáp án → xóa 3 khóa localStorage → `router.push("/attempts/<id>/result")`.

- [ ] **Step 1: Viết test**

```tsx
// src/components/exam/ExamTimer.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ExamTimer } from "./ExamTimer";

describe("ExamTimer", () => {
  afterEach(() => vi.useRealTimers());

  it("hiện mm:ss, đếm lùi, gọi onExpire một lần khi hết giờ", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T08:00:00Z"));
    const onExpire = vi.fn();
    render(<ExamTimer deadline={Date.now() + 65_000} onExpire={onExpire} />);
    expect(screen.getByRole("timer")).toHaveTextContent("01:05");
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("timer")).toHaveTextContent("00:05");
    act(() => { vi.advanceTimersByTime(6_000); });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    expect(onExpire).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("dưới 5 phút thì đổi màu cảnh báo", () => {
    vi.useFakeTimers();
    render(<ExamTimer deadline={Date.now() + 4 * 60_000} onExpire={() => {}} />);
    expect(screen.getByRole("timer").className).toContain("text-neon-pink");
  });
});
```

```tsx
// src/components/exam/ExamRunner.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamRunner } from "./ExamRunner";
import { TOEIC } from "@/features/certificates";
import type { AttemptForClient } from "@/features/attempts/get-attempt";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const q = (id: string, section: string, order: number): AttemptForClient["questions"][number] => ({
  id, section, order, stem: `Câu ${id}`, choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: null,
});

const attempt: AttemptForClient = {
  id: "a1", type: "EXAM", certificate: "toeic", examId: "e1", startedAt: new Date().toISOString(), submittedAt: null, config: null,
  questions: [q("q1", "toeic.p5", 1), q("q2", "toeic.p5", 2), q("q3", "toeic.p7", 3)],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ExamRunner (đề chỉ có phần đọc)", () => {
  beforeEach(() => { localStorage.clear(); push.mockReset(); vi.restoreAllMocks(); });

  it("hiện đồng hồ và câu 1; chọn đáp án lưu vào localStorage; chuyển câu bằng bảng số", async () => {
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText("Câu q1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /C\./ }));
    expect(JSON.parse(localStorage.getItem("attempt:a1:answers")!)).toEqual({ q1: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Tới câu 3" }));
    expect(screen.getByText("Câu q3")).toBeInTheDocument();
  });

  it("đánh dấu xem lại được lưu và hiện trên bảng số", async () => {
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    await userEvent.click(screen.getByRole("button", { name: "Đánh dấu xem lại" }));
    expect(JSON.parse(localStorage.getItem("attempt:a1:flags")!)).toEqual(["q1"]);
    expect(screen.getByRole("button", { name: "Tới câu 1" })).toHaveAttribute("data-flagged", "true");
  });

  it("khôi phục đáp án từ localStorage khi tải lại", () => {
    localStorage.setItem("attempt:a1:answers", JSON.stringify({ q1: 3 }));
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(screen.getByRole("radio", { name: /D\./ })).toHaveAttribute("aria-checked", "true");
  });

  it("nộp bài: xác nhận → POST submit với toàn bộ đáp án → xóa localStorage → chuyển trang kết quả", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ correct: 1, total: 3, scores: { parts: {}, total: 10 }, overtime: false }));
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    await userEvent.click(screen.getByRole("radio", { name: /A\./ }));
    await userEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/attempts/a1/result"));
    const submitCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/submit"))!;
    const body = JSON.parse(String(submitCall[1]?.body));
    expect(body.answers).toEqual([{ questionId: "q1", chosen: 0 }, { questionId: "q2", chosen: null }, { questionId: "q3", chosen: null }]);
    expect(localStorage.getItem("attempt:a1:answers")).toBeNull();
  });

  it("vùng làm bài có data-no-translate", () => {
    const { container } = render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(container.querySelector("[data-no-translate]")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/components/exam`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết component**

```tsx
// src/components/exam/ExamTimer.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = { deadline: number; onExpire: () => void };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamTimer({ deadline, onExpire }: Props) {
  const [left, setLeft] = useState(() => deadline - Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const l = deadline - Date.now();
      setLeft(l);
      if (l <= 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const warn = left < 5 * 60_000;
  return (
    <span role="timer" aria-live="off" className={`font-mono text-2xl font-bold tabular-nums ${warn ? "text-neon-pink" : "text-neon-cyan"}`}>
      {fmt(left)}
    </span>
  );
}
```

```tsx
// src/components/exam/ExamStartButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExamStartButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam/${examId}/start`, { method: "POST" });
      if (!res.ok) throw new Error("fail");
      const { attemptId } = (await res.json()) as { attemptId: string };
      router.push(`/exam/attempt/${attemptId}`);
    } catch {
      setError("Không bắt đầu được, thử lại sau.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={start} disabled={pending} className="btn-neon rounded-full px-6 py-3 font-bold disabled:opacity-50">
        {pending ? "Đang chuẩn bị…" : "Bắt đầu làm bài 🚀"}
      </button>
      {error && <p className="text-sm text-neon-pink">{error}</p>}
    </div>
  );
}
```

```tsx
// src/components/exam/ExamRunner.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttemptForClient } from "@/features/attempts/get-attempt";
import type { SectionSpec } from "@/features/certificates";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { ExamTimer } from "./ExamTimer";

type Props = { attempt: AttemptForClient; sections: SectionSpec[]; timeLimits: { listening: number; reading: number } };

const SYNC_MS = 30_000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bỏ qua khi storage bị chặn */ }
}

export function ExamRunner({ attempt, sections, timeLimits }: Props) {
  const router = useRouter();
  const qs = attempt.questions;
  const K = useMemo(() => ({ answers: `attempt:${attempt.id}:answers`, flags: `attempt:${attempt.id}:flags`, reading: `attempt:${attempt.id}:readingStartedAt` }), [attempt.id]);
  const skillOf = useMemo(() => new Map(sections.map((s) => [s.id, s.skill])), [sections]);
  const nameOf = useMemo(() => new Map(sections.map((s) => [s.id, s.name])), [sections]);

  const listeningQs = qs.filter((q) => skillOf.get(q.section) === "listening");
  const readingQs = qs.filter((q) => skillOf.get(q.section) !== "listening");

  // Đáp án: server trước, localStorage ghi đè (client mới hơn)
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const fromServer: Record<string, number> = {};
    for (const q of qs) if (q.chosen !== null) fromServer[q.id] = q.chosen;
    return { ...fromServer, ...readJson<Record<string, number>>(K.answers, {}) };
  });
  const [flags, setFlags] = useState<string[]>(() => readJson<string[]>(K.flags, []));
  const [readingStartedAt, setReadingStartedAt] = useState<number | null>(() => {
    const saved = readJson<number | null>(K.reading, null);
    if (saved) return saved;
    return listeningQs.length === 0 ? new Date(attempt.startedAt).getTime() : null;
  });
  const phase: "listening" | "reading" = readingStartedAt === null ? "listening" : "reading";
  const visible = phase === "listening" ? listeningQs : readingQs;

  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const payload = useCallback(() => qs.map((q) => ({ questionId: q.id, chosen: answersRef.current[q.id] ?? null })), [qs]);

  // Đồng bộ định kỳ
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`/api/attempts/${attempt.id}/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload() }) }).catch(() => {});
    }, SYNC_MS);
    return () => clearInterval(id);
  }, [attempt.id, payload]);

  function choose(qid: string, i: number) {
    setAnswers((a) => {
      const next = { ...a, [qid]: i };
      writeJson(K.answers, next);
      return next;
    });
  }
  function toggleFlag(qid: string) {
    setFlags((f) => {
      const next = f.includes(qid) ? f.filter((x) => x !== qid) : [...f, qid];
      writeJson(K.flags, next);
      return next;
    });
  }
  function startReading() {
    const now = Date.now();
    writeJson(K.reading, now);
    setReadingStartedAt(now);
    setIdx(0);
  }

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload() }) });
      if (!res.ok && res.status !== 409) throw new Error("fail");
      localStorage.removeItem(K.answers);
      localStorage.removeItem(K.flags);
      localStorage.removeItem(K.reading);
      router.push(`/attempts/${attempt.id}/result`);
    } catch {
      setError("Không nộp được bài. Kiểm tra mạng rồi bấm Nộp bài lại; đáp án của bạn vẫn được giữ.");
      setSubmitting(false);
    }
  }, [attempt.id, payload, router, submitting, K]);

  const onExpire = useCallback(() => { void submit(); }, [submit]);

  function confirmSubmit() {
    const unanswered = qs.filter((q) => answers[q.id] === undefined).length;
    const msg = unanswered > 0 ? `Còn ${unanswered} câu chưa trả lời. Nộp bài ngay?` : "Nộp bài ngay?";
    if (window.confirm(msg)) void submit();
  }

  const q = visible[idx];
  if (!q) return <p className="text-muted">Đề này không có câu hỏi.</p>;
  const deadline = readingStartedAt !== null ? readingStartedAt + timeLimits.reading * 60_000 : null;
  const answeredCount = Object.keys(answers).length;

  return (
    <div data-no-translate className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-4">
        <header className="card flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{phase === "listening" ? "Phần nghe" : "Phần đọc"}</p>
            <p className="text-sm text-muted">{nameOf.get(q.section) ?? q.section}</p>
          </div>
          {deadline !== null ? <ExamTimer deadline={deadline} onExpire={onExpire} /> : <span className="text-sm text-muted">Nghe theo audio</span>}
        </header>

        <QuestionCard q={q} index={q.order} selected={answers[q.id] ?? null} onSelect={(i) => choose(q.id, i)} autoPlayAudio={phase === "listening"} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => toggleFlag(q.id)} className={`rounded-full border px-4 py-2 text-sm font-medium ${flags.includes(q.id) ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-line hover:bg-white/5"}`}>
            {flags.includes(q.id) ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-40">Trước</button>
            {idx < visible.length - 1 ? (
              <button type="button" onClick={() => setIdx((i) => i + 1)} className="btn-neon rounded-full px-4 py-2 text-sm font-semibold">Câu tiếp</button>
            ) : phase === "listening" ? (
              <button type="button" onClick={startReading} className="btn-neon rounded-full px-4 py-2 text-sm font-semibold">Chuyển sang phần đọc</button>
            ) : null}
          </div>
        </div>
        {error && <p className="text-sm text-neon-pink">{error}</p>}
      </div>

      <aside className="card w-full p-4 lg:sticky lg:top-20 lg:w-72">
        <p className="text-sm text-muted">Đã trả lời <span className="font-semibold text-foreground">{answeredCount}/{qs.length}</span></p>
        <div className="mt-3 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
          {visible.map((v, i) => {
            const done = answers[v.id] !== undefined;
            const flagged = flags.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                aria-label={`Tới câu ${v.order}`}
                data-flagged={flagged}
                onClick={() => setIdx(i)}
                className={`relative h-9 rounded-lg text-xs font-semibold ${i === idx ? "ring-2 ring-neon-cyan" : ""} ${done ? "bg-neon-violet/40" : "bg-surface-2"} ${flagged ? "outline outline-1 outline-amber-400" : ""}`}
              >
                {v.order}
              </button>
            );
          })}
        </div>
        {phase === "reading" && (
          <button type="button" onClick={confirmSubmit} disabled={submitting} className="btn-neon mt-4 w-full rounded-full px-4 py-2.5 font-bold disabled:opacity-50">
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </button>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test component, xác nhận pass**

Run: `npm test -- src/components/exam`
Expected: PASS 7 test.

- [ ] **Step 5: Trang danh sách đề, giới thiệu đề, màn làm bài**

```tsx
// src/app/exam/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Thi thử" };

export default async function ExamListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const exams = await prisma.exam.findMany({
    where: { certificate: "toeic", status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">🎯 Thi thử TOEIC</h1>
        <p className="mt-2 text-muted">Làm bài như thi thật: audio phát một lần, phần đọc 75 phút, nộp bài xem điểm ước tính.</p>
      </header>
      {exams.length === 0 ? (
        <p className="card p-6 text-muted">Chưa có đề nào được đăng.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => (
            <li key={e.id}>
              <Link href={`/exam/${e.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:border-neon-violet/60">
                <h2 className="text-lg font-bold">{e.title}</h2>
                <p className="mt-1 text-sm text-muted">{e._count.questions} câu{e._count.questions < 200 ? " · đề rút gọn" : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// src/app/exam/[examId]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOEIC } from "@/features/certificates";
import { ExamStartButton } from "@/components/exam/ExamStartButton";

export const metadata: Metadata = { title: "Giới thiệu đề" };

export default async function ExamIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { examId } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { questions: { select: { question: { select: { section: true } } } } } });
  if (!exam || exam.status !== "PUBLISHED") notFound();

  const countBySection = new Map<string, number>();
  for (const eq of exam.questions) countBySection.set(eq.question.section, (countBySection.get(eq.question.section) ?? 0) + 1);
  const hasListening = TOEIC.sections.some((s) => s.skill === "listening" && countBySection.has(s.id));

  const previous = await prisma.attempt.findMany({
    where: { userId: session.user.id, examId, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 5,
    select: { id: true, submittedAt: true, scores: true },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">{TOEIC.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{exam.title}</h1>
      </header>
      <section className="card p-6">
        <h2 className="font-bold">Cấu trúc đề</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {TOEIC.sections.filter((s) => countBySection.has(s.id)).map((s) => (
            <li key={s.id} className="flex justify-between py-2"><span>{s.name}</span><span className="text-muted">{countBySection.get(s.id)} câu</span></li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {hasListening ? `Phần nghe: audio phát một lần, không tua. Sau đó phần đọc ${TOEIC.timeLimits.reading} phút.` : `Đề này chỉ có phần đọc: ${TOEIC.timeLimits.reading} phút, hết giờ tự nộp.`}
          {" "}Popup dịch bị tắt trong lúc làm bài.
        </p>
        <div className="mt-6"><ExamStartButton examId={exam.id} /></div>
      </section>
      {previous.length > 0 && (
        <section className="card p-6">
          <h2 className="font-bold">Lần làm trước</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {previous.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-muted">{a.submittedAt?.toLocaleString("vi-VN")}</span>
                <span className="font-semibold text-neon">{(a.scores as { total?: number } | null)?.total ?? "—"} điểm</span>
                <Link href={`/attempts/${a.id}/result`} className="text-neon-cyan hover:underline">Xem</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

```tsx
// src/app/exam/attempt/[attemptId]/page.tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttemptForUser, type AttemptForClient } from "@/features/attempts/get-attempt";
import { getCertificate } from "@/features/certificates";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = { title: "Đang làm bài" };

export default async function ExamAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { attemptId } = await params;

  let attempt: AttemptForClient;
  try {
    attempt = await getAttemptForUser(prisma, { attemptId, userId: session.user.id });
  } catch (e) {
    if (e instanceof Error && (e.message === "NOT_FOUND" || e.message === "FORBIDDEN")) notFound();
    throw e;
  }
  if (attempt.type !== "EXAM") redirect(`/drill/${attempt.id}`);
  if (attempt.submittedAt) redirect(`/attempts/${attempt.id}/result`);

  const cert = getCertificate(attempt.certificate);
  return <ExamRunner attempt={attempt} sections={cert.sections} timeLimits={cert.timeLimits} />;
}
```

- [ ] **Step 6: Kiểm tra bằng trình duyệt**

Mở `/exam`, thấy "Đề rút gọn 1 · 12 câu · đề rút gọn". Bấm vào, "Bắt đầu làm bài" → màn làm bài có đồng hồ 75:00, bảng 12 số, chọn vài câu, tải lại trang vẫn giữ đáp án, bấm "Nộp bài" → chuyển sang trang kết quả (Task 10 mới có trang; lúc này 404 là bình thường). Bôi đen chữ trong vùng làm bài không hiện popup dịch.

- [ ] **Step 7: typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/components/exam src/app/exam
git commit -m "feat: thi thử — danh sách đề, đồng hồ, làm bài, đồng bộ đáp án, nộp bài"
```

---

### Task 10: Trang kết quả cho cả thi thử và drill

**Files:**
- Create: `src/components/exam/ResultView.tsx`
- Create: `src/app/attempts/[attemptId]/result/page.tsx`
- Test: `src/components/exam/ResultView.test.tsx`

**Interfaces:**
- Consumes: `AttemptResult`, `getAttemptResult` (Task 6), `QuestionCard` (Task 8).
- Produces: `<ResultView result={AttemptResult} />`.

- [ ] **Step 1: Viết test**

```tsx
// src/components/exam/ResultView.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultView } from "./ResultView";
import type { AttemptResult } from "@/features/attempts/get-result";

const base: AttemptResult = {
  id: "a1", type: "EXAM", certificate: "toeic", examId: "e1", startedAt: "2026-09-05T08:00:00.000Z", submittedAt: "2026-09-05T09:00:00.000Z",
  overtime: false, scores: { parts: { listening: 5, reading: 130 }, total: 135 }, correct: 1, total: 2,
  bySection: [{ section: "toeic.p5", name: "Part 5 – Hoàn thành câu", correct: 1, total: 2 }],
  questions: [
    { id: "q1", section: "toeic.p5", order: 1, stem: "Đúng rồi", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: 1, answer: 1, explanation: "E1", isCorrect: true },
    { id: "q2", section: "toeic.p5", order: 2, stem: "Sai rồi", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: 0, answer: 1, explanation: "E2", isCorrect: false },
  ],
};

describe("ResultView", () => {
  it("thi thử: hiện điểm nghe, đọc, tổng và bảng theo Part", () => {
    render(<ResultView result={base} />);
    expect(screen.getByText("135")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText(/Part 5/)).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("lọc chỉ câu sai", async () => {
    render(<ResultView result={base} />);
    expect(screen.getByText("Đúng rồi")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Chỉ hiện câu sai" }));
    expect(screen.queryByText("Đúng rồi")).toBeNull();
    expect(screen.getByText("Sai rồi")).toBeInTheDocument();
    expect(screen.getByText("E2")).toBeInTheDocument();
  });

  it("drill: không có điểm quy đổi, hiện số câu đúng; overtime hiện cảnh báo", () => {
    render(<ResultView result={{ ...base, type: "DRILL", scores: null, overtime: true }} />);
    expect(screen.queryByText("135")).toBeNull();
    expect(screen.getByText("Nộp quá giờ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Luyện tiếp" })).toHaveAttribute("href", "/drill");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- src/components/exam/ResultView.test.tsx`
Expected: FAIL vì thiếu module.

- [ ] **Step 3: Viết component và trang**

```tsx
// src/components/exam/ResultView.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttemptResult } from "@/features/attempts/get-result";
import { QuestionCard } from "@/components/questions/QuestionCard";

export function ResultView({ result }: { result: AttemptResult }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const shown = onlyWrong ? result.questions.filter((q) => !q.isCorrect) : result.questions;
  const isExam = result.type === "EXAM";

  return (
    <div className="flex flex-col gap-6">
      <section className="card relative overflow-hidden p-6 md:p-8">
        <div className="glow -top-20 -right-10 h-60 w-60 bg-neon-violet" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">{isExam ? "Kết quả thi thử" : "Kết quả luyện tập"}</p>
            {isExam && result.scores ? (
              <>
                <p className="mt-2 text-6xl font-extrabold text-neon">{result.scores.total}</p>
                <p className="mt-1 text-sm text-muted">Điểm ước tính (tối đa 990)</p>
              </>
            ) : (
              <p className="mt-2 text-6xl font-extrabold text-neon">{result.correct}/{result.total}</p>
            )}
            {result.overtime && <span className="mt-3 inline-block rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">Nộp quá giờ</span>}
          </div>
          {isExam && result.scores && (
            <dl className="flex gap-6">
              {Object.entries(result.scores.parts).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface-2 px-5 py-3 text-center">
                  <dt className="text-xs uppercase tracking-wider text-muted">{k === "listening" ? "Nghe" : k === "reading" ? "Đọc" : k}</dt>
                  <dd className="text-2xl font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-bold">Theo phần</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {result.bySection.map((s) => (
            <li key={s.section} className="flex items-center justify-between py-2">
              <span>{s.name}</span>
              <span className="font-semibold">{s.correct}/{s.total}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="h-4 w-4 accent-[#ec4899]" aria-label="Chỉ hiện câu sai" />
          Chỉ hiện câu sai
        </label>
        <div className="flex gap-2">
          {isExam ? (
            <Link href="/exam" className="btn-neon rounded-full px-5 py-2 text-sm font-semibold">Chọn đề khác</Link>
          ) : (
            <Link href="/drill" className="btn-neon rounded-full px-5 py-2 text-sm font-semibold">Luyện tiếp</Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {shown.map((q) => (
          <QuestionCard key={q.id} q={q} index={q.order} selected={q.chosen} disabled reveal={{ answer: q.answer, explanation: q.explanation }} />
        ))}
        {shown.length === 0 && <p className="text-center text-muted">Không có câu sai. Xuất sắc! 🎉</p>}
      </div>
    </div>
  );
}
```

```tsx
// src/app/attempts/[attemptId]/result/page.tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttemptResult, type AttemptResult } from "@/features/attempts/get-result";
import { ResultView } from "@/components/exam/ResultView";

export const metadata: Metadata = { title: "Kết quả" };

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { attemptId } = await params;

  let result: AttemptResult;
  try {
    result = await getAttemptResult(prisma, { attemptId, userId: session.user.id });
  } catch (e) {
    if (e instanceof Error && (e.message === "NOT_FOUND" || e.message === "FORBIDDEN")) notFound();
    if (e instanceof Error && e.message === "NOT_SUBMITTED") {
      const a = await prisma.attempt.findUnique({ where: { id: attemptId }, select: { type: true } });
      redirect(a?.type === "EXAM" ? `/exam/attempt/${attemptId}` : `/drill/${attemptId}`);
    }
    throw e;
  }
  return <ResultView result={result} />;
}
```

Lưu ý: trong Next.js, `redirect()` và `notFound()` ném lỗi đặc biệt; gọi chúng **bên trong** `catch` là được vì Next bắt ở tầng trên (không phải lỗi thường). Không bọc chúng trong `try` khác.

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `npm test -- src/components/exam/ResultView.test.tsx && npm run typecheck && npm run lint`
Expected: PASS 3 test, 0 lỗi.

- [ ] **Step 5: Kiểm tra bằng trình duyệt**

Làm lại luồng thi thử ở Task 9 Step 6 đến nộp bài: phải sang trang kết quả với điểm ước tính, bảng theo Part, lọc câu sai hoạt động. Làm một drill đến hết, bấm "Xem chi tiết" → cùng trang kết quả nhưng không có điểm quy đổi.

- [ ] **Step 6: Commit**

```bash
git add src/components/exam/ResultView.tsx src/components/exam/ResultView.test.tsx src/app/attempts
git commit -m "feat: trang kết quả cho thi thử và luyện tập, lọc câu sai"
```

---

### Task 11: Tài liệu và kiểm tra tổng

**Files:**
- Modify: `README.md` (thêm mục "Nhập câu hỏi" sau phần từ điển; thêm luồng test thi thử/drill vào hướng dẫn test)
- Modify: `CLAUDE.md` (mục Lệnh: thêm `npm run db:import-questions -- prisma/seed/fixtures/questions-sample.json --exam "Đề rút gọn 1"`; mục Kiến trúc: thêm đoạn về `certificates/`, `attempts/`, `api-errors.ts`)
- Modify: `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` dòng "Trạng thái": ghi "kế hoạch 2 đã xong".

- [ ] **Step 1: README**

Thêm sau mục nhập từ điển:

```markdown
## Nhập câu hỏi và đề thi

Câu hỏi nằm trong file JSON (xem mẫu `prisma/seed/fixtures/questions-sample.json`, định dạng mô tả trong `src/features/questions/import-schema.ts`).

```bash
npm run db:import-questions -- prisma/seed/fixtures/questions-sample.json --exam "Đề rút gọn 1"
# --draft: nhập ở trạng thái DRAFT (chưa hiện cho người dùng)
# không có --exam: chỉ nhập câu cho luyện tập
```

Đề đầy đủ TOEIC cần 200 câu theo cấu trúc trong `src/features/certificates/toeic.ts`; đề ít câu hơn vẫn chạy được và được ghi "đề rút gọn".
```

Trong mục hướng dẫn test thêm hai bước: "Luyện tập: /drill → Part 5 → 10 câu" và "Thi thử: /exam → Đề rút gọn 1 → làm → Nộp bài → xem điểm".

- [ ] **Step 2: CLAUDE.md**

Thêm vào khối lệnh: `npm run db:import-questions -- <file.json> [--exam "Tên"] [--draft]   # nhập câu hỏi/đề`.

Thêm đoạn vào mục Kiến trúc, sau phần "Luồng popup dịch":

```markdown
**Chứng chỉ & làm bài:** quy tắc từng chứng chỉ (phần thi, số câu, thời gian, quy đổi điểm) là object `CertificateSpec` trong `src/features/certificates/<mã>.ts`; database chỉ lưu chuỗi `certificate` ("toeic") và `section` ("toeic.p5"). Một lượt làm bài = `Attempt` + các `AttemptAnswer` tạo sẵn lúc bắt đầu (`start-drill.ts`, `start-exam.ts`); drill chấm từng câu (`answer-drill.ts`), thi lưu đáp án hàng loạt (`save-exam-answers.ts`) rồi chấm khi nộp (`submit.ts`). DTO xuống client qua `questions/dto.ts` không bao giờ chứa `answer`/`explanation`. Route handler map mã lỗi bằng `src/lib/api-errors.ts`. Vùng thi có `data-no-translate`.
```

- [ ] **Step 3: Kiểm tra tổng**

Run:
```bash
npm test
npm run typecheck
npm run lint
npm run build
```
Expected: toàn bộ test pass (72 cũ + khoảng 55 mới), 0 lỗi kiểu, lint sạch, build thành công, các route `/drill`, `/drill/[attemptId]`, `/exam`, `/exam/[examId]`, `/exam/attempt/[attemptId]`, `/attempts/[attemptId]/result`, 5 API mới xuất hiện trong bảng build.

Kiểm tra tay lần cuối theo Task 8 Step 6, Task 9 Step 6, Task 10 Step 5.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md
git commit -m "docs: hướng dẫn nhập câu hỏi, kiến trúc chứng chỉ và lượt làm bài"
```

---

## Việc để lại cho kế hoạch sau

- Kế hoạch 3 (dashboard): thống kê theo skillTag 30 ngày từ `AttemptAnswer` + `Question.skillTags`; điểm ước tính gần nhất từ `Attempt.scores`.
- Kế hoạch 6/7 (admin, AI, TTS): tạo đề tự động từ ngân hàng theo `CertificateSpec.sections`, câu Listening có audio thật, giao diện quản lý câu hỏi thay cho script.
- Chưa có: giới hạn số lượt thi đang mở của một người dùng; dọn `Attempt` bỏ dở quá 7 ngày; Playwright cho luồng thi.
