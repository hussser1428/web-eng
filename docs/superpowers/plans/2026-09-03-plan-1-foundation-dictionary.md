# Kế hoạch 1: Khung dự án, đăng nhập, từ điển nội bộ, popup dịch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng khung Next.js + Prisma + Auth.js, nhập từ điển Anh-Việt vào database, và làm popup dịch khi bôi đen hoạt động trên toàn trang, có lưu từ cho người đã đăng nhập.

**Architecture:** Next.js App Router với Server Actions và Route Handlers; nghiệp vụ thuần TypeScript nằm trong `src/features/*` và `src/lib/*`, nhận `PrismaClient` qua tham số để test bằng fake. Dịch vụ ngoài (LibreTranslate) nằm sau giao diện `TranslateProvider`. Popup dịch là một client component gắn ở layout chính.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Prisma 6, PostgreSQL 16 (Docker), Auth.js v5 (`next-auth@beta`) + `@auth/prisma-adapter`, `bcryptjs`, `zod`, Vitest + Testing Library, LibreTranslate (Docker).

**Spec:** `docs/superpowers/specs/2026-09-03-toeic-prep-web-design.md` (mục 2, 3, 4.6, 7, 9 bước 1–2)

## Global Constraints

- Node 22, npm. Không dùng yarn/pnpm.
- Vận hành không tốn phí AI: dịch bằng LibreTranslate tự cài, phát âm bằng Web Speech API của trình duyệt.
- Mọi nghiệp vụ truy cập database nhận `db: PrismaClient` qua tham số (dependency injection) để unit test không cần Postgres.
- Popup dịch giới hạn 500 ký tự mỗi lần dịch, timeout LibreTranslate 5 giây, không hiện trong phần tử `input`, `textarea` hoặc vùng có `data-no-translate`.
- Người chưa đăng nhập vẫn dịch được nhưng không lưu từ.
- Vai trò người dùng: `USER` | `ADMIN`.
- Commit sau mỗi task. Message commit tiếng Việt hoặc tiếng Anh đều được, có prefix `feat:`, `test:`, `chore:`.
- Kế hoạch này chưa cài Playwright; test giao diện dùng Testing Library + jsdom. Playwright sẽ thêm ở kế hoạch 3 (thi thử).

---

## Cấu trúc file của kế hoạch này

```
docker-compose.yml                       # postgres + libretranslate
.env.example
prisma/schema.prisma
prisma/seed/import-stardict.ts           # script nhập từ điển
prisma/seed/fixtures/sample.dict         # fixture text nhỏ để test
src/app/layout.tsx                       # root layout: font, TranslatePopup
src/app/page.tsx                         # trang chủ tạm
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/api/auth/[...nextauth]/route.ts
src/app/api/translate/route.ts
src/app/api/vocab/save/route.ts
src/lib/prisma.ts                        # singleton PrismaClient
src/lib/auth.ts                          # cấu hình Auth.js
src/lib/password.ts                      # hash/verify
src/lib/providers/translate/types.ts     # TranslateProvider
src/lib/providers/translate/libretranslate.ts
src/features/auth/register.ts            # nghiệp vụ đăng ký
src/features/dictionary/normalize.ts     # chuẩn hóa từ, sinh dạng gốc
src/features/dictionary/parse-stardict.ts# parse .idx/.dict và format Hồ Ngọc Đức
src/features/dictionary/lookup.ts        # tra từ trong bảng Word
src/features/translate/direction.ts      # phát hiện chiều dịch
src/features/translate/translate.ts      # tra từ -> cache -> provider
src/features/vocab/save-word.ts          # lưu UserWord
src/components/translate-popup/TranslatePopup.tsx
src/components/translate-popup/use-selection.ts
tests/**                                 # test đặt cạnh nguồn: *.test.ts(x)
```

---

### Task 1: Khởi tạo dự án Next.js và Vitest

**Files:**
- Create: toàn bộ khung bằng `create-next-app`
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/lib/sum.test.ts` (test khói, xóa ở task sau)
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: lệnh `npm test` chạy Vitest, `npm run dev` chạy Next.

- [ ] **Step 1: Tạo dự án**

Chạy trong thư mục gốc dự án (thư mục hiện tại đã có `docs/` và `.git`):

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Nếu hỏi ghi đè vì thư mục không trống, chọn Yes (chỉ có `docs/` và `.git`, không bị ảnh hưởng).

- [ ] **Step 2: Cài Vitest và Testing Library**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Cấu hình Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

`src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Thêm vào `package.json` phần `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Viết test khói**

`src/lib/sum.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Chạy test**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Kiểm tra dev server khởi động**

Run: `npm run build`
Expected: build thành công, không lỗi TypeScript.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: khởi tạo Next.js 15, Tailwind, Vitest"
```

---

### Task 2: Postgres bằng Docker, Prisma schema, singleton client

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `.env`
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`
- Modify: `package.json` (scripts prisma), `.gitignore` (thêm `.env`)

**Interfaces:**
- Produces: các model `User`, `Account`, `Session`, `VerificationToken`, `Word`, `UserWord`, `TranslationCache`; export `prisma` từ `@/lib/prisma`.

- [ ] **Step 1: Docker compose**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: toeic
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  libretranslate:
    image: libretranslate/libretranslate:latest
    environment:
      LT_LOAD_ONLY: en,vi
    ports:
      - "5000:5000"
volumes:
  pgdata:
```

- [ ] **Step 2: Biến môi trường**

`.env.example`:

```
DATABASE_URL="postgresql://app:app@localhost:5432/toeic?schema=public"
AUTH_SECRET="doi-thanh-chuoi-ngau-nhien"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
LIBRETRANSLATE_URL="http://localhost:5000"
```

Sao chép thành `.env`, sinh `AUTH_SECRET` bằng `npx auth secret` hoặc `openssl rand -base64 32`. Thêm dòng `.env` vào `.gitignore` nếu chưa có.

- [ ] **Step 3: Cài Prisma**

```bash
npm i @prisma/client
npm i -D prisma tsx
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 4: Schema**

Ghi đè `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  role          Role      @default(USER)
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  userWords     UserWord[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Word {
  id        String     @id @default(cuid())
  headword  String     @unique
  phonetic  String?
  pos       String?
  meaningVi String
  exampleEn String?
  exampleVi String?
  cefr      String?
  userWords UserWord[]

  @@index([pos])
}

model UserWord {
  id            String   @id @default(cuid())
  userId        String
  wordId        String
  sourceContext String?
  easeFactor    Float    @default(2.5)
  intervalDays  Int      @default(0)
  repetitions   Int      @default(0)
  dueAt         DateTime @default(now())
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  word          Word     @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@unique([userId, wordId])
  @@index([userId, dueAt])
}

model TranslationCache {
  key       String   @id
  text      String
  from      String
  to        String
  result    String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 5: Singleton client**

`src/lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 6: Scripts và migrate**

Thêm vào `package.json` scripts:

```json
"db:up": "docker compose up -d db",
"db:migrate": "prisma migrate dev",
"db:studio": "prisma studio"
```

Run:

```bash
npm run db:up
npx prisma migrate dev --name init
```

Expected: migration tạo trong `prisma/migrations/`, client sinh xong, không lỗi.

- [ ] **Step 7: Xóa test khói và commit**

```bash
rm src/lib/sum.test.ts
git add -A
git commit -m "feat: docker postgres, prisma schema ban đầu"
```

---

### Task 3: Mật khẩu và nghiệp vụ đăng ký

**Files:**
- Create: `src/lib/password.ts`, `src/lib/password.test.ts`
- Create: `src/features/auth/register.ts`, `src/features/auth/register.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - `registerUser(db, input: { email: string; password: string; name?: string }): Promise<{ ok: true; userId: string } | { ok: false; error: "EMAIL_TAKEN" | "INVALID" }>`
  - `type Db = Pick<PrismaClient, "user">` dùng cho DI.

- [ ] **Step 1: Cài bcryptjs và zod**

```bash
npm i bcryptjs zod
npm i -D @types/bcryptjs
```

- [ ] **Step 2: Test mật khẩu**

`src/lib/password.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hash rồi verify đúng", async () => {
    const hash = await hashPassword("abc12345");
    expect(hash).not.toBe("abc12345");
    expect(await verifyPassword("abc12345", hash)).toBe(true);
    expect(await verifyPassword("sai", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/lib/password.test.ts`
Expected: FAIL, không tìm thấy module `./password`.

- [ ] **Step 4: Cài đặt**

`src/lib/password.ts`:

```ts
import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 5: Chạy test, mong đợi PASS**

Run: `npx vitest run src/lib/password.test.ts`
Expected: PASS.

- [ ] **Step 6: Test đăng ký**

`src/features/auth/register.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { registerUser } from "./register";

function fakeDb(existing: { email: string }[] = []) {
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
        existing.find((u) => u.email === where.email) ?? null
      ),
      create: vi.fn(async ({ data }: { data: { email: string } }) => ({
        id: "u1",
        ...data,
      })),
    },
  };
}

describe("registerUser", () => {
  it("tạo user mới với email chuẩn hóa và mật khẩu đã hash", async () => {
    const db = fakeDb();
    const r = await registerUser(db as never, {
      email: "  Test@Example.com ",
      password: "abc12345",
      name: "T",
    });
    expect(r).toEqual({ ok: true, userId: "u1" });
    const data = db.user.create.mock.calls[0][0].data;
    expect(data.email).toBe("test@example.com");
    expect(data.passwordHash).not.toBe("abc12345");
    expect(data.role).toBe("USER");
  });

  it("từ chối email trùng", async () => {
    const db = fakeDb([{ email: "a@b.com" }]);
    const r = await registerUser(db as never, { email: "a@b.com", password: "abc12345" });
    expect(r).toEqual({ ok: false, error: "EMAIL_TAKEN" });
  });

  it("từ chối mật khẩu ngắn hoặc email sai", async () => {
    const db = fakeDb();
    expect(await registerUser(db as never, { email: "x", password: "abc12345" })).toEqual({
      ok: false,
      error: "INVALID",
    });
    expect(await registerUser(db as never, { email: "a@b.com", password: "123" })).toEqual({
      ok: false,
      error: "INVALID",
    });
  });
});
```

- [ ] **Step 7: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/features/auth/register.test.ts`
Expected: FAIL, không tìm thấy module `./register`.

- [ ] **Step 8: Cài đặt**

`src/features/auth/register.ts`:

```ts
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/password";

export type Db = Pick<PrismaClient, "user">;

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  name: z.string().trim().max(50).optional(),
});

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: "EMAIL_TAKEN" | "INVALID" };

export async function registerUser(
  db: Db,
  input: { email: string; password: string; name?: string }
): Promise<RegisterResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "EMAIL_TAKEN" };

  const user = await db.user.create({
    data: { email, name: name ?? null, passwordHash: await hashPassword(password), role: "USER" },
  });
  return { ok: true, userId: user.id };
}
```

- [ ] **Step 9: Chạy test, mong đợi PASS**

Run: `npx vitest run src/features/auth`
Expected: 3 passed.

- [ ] **Step 10: Commit**

```bash
git add src/lib/password.ts src/lib/password.test.ts src/features/auth package.json package-lock.json
git commit -m "feat: hash mật khẩu và nghiệp vụ đăng ký"
```

---

### Task 4: Auth.js, trang đăng nhập và đăng ký

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/actions.ts`
- Create: `src/types/next-auth.d.ts`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `registerUser`, `verifyPassword`, `prisma`.
- Produces: `auth()` trả session có `session.user.id` và `session.user.role`; `signIn`, `signOut`.

- [ ] **Step 1: Cài Auth.js**

```bash
npm i next-auth@beta @auth/prisma-adapter
```

- [ ] **Step 2: Cấu hình Auth.js**

`src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "USER" | "ADMIN";
      return session;
    },
  },
});
```

`src/types/next-auth.d.ts`:

```ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "USER" | "ADMIN"; email?: string | null; name?: string | null; image?: string | null };
  }
  interface User {
    role?: "USER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ADMIN";
  }
}
```

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Server actions cho form**

`src/app/(auth)/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerUser } from "@/features/auth/register";

export async function registerAction(_prev: string | null, formData: FormData): Promise<string | null> {
  const r = await registerUser(prisma, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "") || undefined,
  });
  if (!r.ok) {
    return r.error === "EMAIL_TAKEN" ? "Email đã được dùng." : "Email hoặc mật khẩu không hợp lệ (mật khẩu tối thiểu 8 ký tự).";
  }
  redirect("/login?registered=1");
}

export async function loginAction(_prev: string | null, formData: FormData): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return "Sai email hoặc mật khẩu.";
    throw e;
  }
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/" });
}
```

- [ ] **Step 4: Trang đăng ký và đăng nhập**

`src/app/(auth)/register/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "../actions";

export default function RegisterPage() {
  const [error, action, pending] = useActionState(registerAction, null);
  return (
    <main className="mx-auto max-w-sm p-6" data-no-translate>
      <h1 className="mb-4 text-2xl font-bold">Đăng ký</h1>
      <form action={action} className="flex flex-col gap-3">
        <input name="name" placeholder="Tên (tùy chọn)" className="rounded border p-2" />
        <input name="email" type="email" required placeholder="Email" className="rounded border p-2" />
        <input name="password" type="password" required minLength={8} placeholder="Mật khẩu (≥ 8 ký tự)" className="rounded border p-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          Tạo tài khoản
        </button>
      </form>
      <p className="mt-4 text-sm">
        Đã có tài khoản? <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link>
      </p>
    </main>
  );
}
```

`src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, googleAction } from "../actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null);
  const params = useSearchParams();
  return (
    <main className="mx-auto max-w-sm p-6" data-no-translate>
      <h1 className="mb-4 text-2xl font-bold">Đăng nhập</h1>
      {params.get("registered") && <p className="mb-3 text-sm text-green-700">Đăng ký thành công, hãy đăng nhập.</p>}
      <form action={action} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="Email" className="rounded border p-2" />
        <input name="password" type="password" required placeholder="Mật khẩu" className="rounded border p-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          Đăng nhập
        </button>
      </form>
      <form action={googleAction} className="mt-3">
        <button className="w-full rounded border p-2">Đăng nhập bằng Google</button>
      </form>
      <p className="mt-4 text-sm">
        Chưa có tài khoản? <Link href="/register" className="text-blue-600 underline">Đăng ký</Link>
      </p>
    </main>
  );
}
```

Bọc `LoginPage` trong `<Suspense>` vì dùng `useSearchParams`: đổi tên component thành `LoginForm` và export default:

```tsx
import { Suspense } from "react";
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 5: Trang chủ tạm hiện trạng thái đăng nhập**

`src/app/page.tsx`:

```tsx
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">TOEIC Prep</h1>
      {session?.user ? (
        <div className="mt-4 flex items-center gap-3">
          <span>Xin chào, {session.user.name ?? session.user.email}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="rounded border px-3 py-1">Đăng xuất</button>
          </form>
        </div>
      ) : (
        <p className="mt-4">
          <Link href="/login" className="text-blue-600 underline">Đăng nhập</Link> hoặc{" "}
          <Link href="/register" className="text-blue-600 underline">đăng ký</Link>
        </p>
      )}
      <p className="mt-8 text-gray-700">
        Bôi đen bất kỳ từ tiếng Anh nào trên trang để xem nghĩa. Ví dụ: The committee will postpone the meeting until further notice.
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Kiểm tra thủ công**

Run: `npm run dev`, mở `http://localhost:3000/register`, tạo tài khoản, đăng nhập, thấy tên, đăng xuất.
Expected: luồng chạy đủ, không lỗi console server.

- [ ] **Step 7: Build và commit**

Run: `npm run build`
Expected: thành công.

```bash
git add -A
git commit -m "feat: đăng nhập/đăng ký bằng Auth.js"
```

---

### Task 5: Chuẩn hóa từ và sinh dạng gốc

**Files:**
- Create: `src/features/dictionary/normalize.ts`, `src/features/dictionary/normalize.test.ts`

**Interfaces:**
- Produces:
  - `normalizeHeadword(s: string): string` – trim, lowercase, bỏ dấu câu hai đầu.
  - `candidateForms(word: string): string[]` – danh sách ứng viên theo thứ tự ưu tiên (chính từ, rồi các dạng gốc), không trùng.

- [ ] **Step 1: Test**

`src/features/dictionary/normalize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeHeadword, candidateForms } from "./normalize";

describe("normalizeHeadword", () => {
  it("trim, lowercase, bỏ dấu câu hai đầu", () => {
    expect(normalizeHeadword('  "Postpone,"  ')).toBe("postpone");
    expect(normalizeHeadword("don't")).toBe("don't");
  });
});

describe("candidateForms", () => {
  it("giữ từ gốc ở đầu và không trùng", () => {
    expect(candidateForms("book")[0]).toBe("book");
    expect(new Set(candidateForms("book")).size).toBe(candidateForms("book").length);
  });
  it("đuôi s / es / ies", () => {
    expect(candidateForms("books")).toContain("book");
    expect(candidateForms("boxes")).toContain("box");
    expect(candidateForms("cities")).toContain("city");
  });
  it("đuôi ed / d / ied", () => {
    expect(candidateForms("walked")).toContain("walk");
    expect(candidateForms("moved")).toContain("move");
    expect(candidateForms("tried")).toContain("try");
    expect(candidateForms("stopped")).toContain("stop");
  });
  it("đuôi ing", () => {
    expect(candidateForms("walking")).toContain("walk");
    expect(candidateForms("moving")).toContain("move");
    expect(candidateForms("running")).toContain("run");
  });
  it("từ ngắn không bị cắt vô nghĩa", () => {
    expect(candidateForms("is")).toEqual(["is"]);
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/features/dictionary/normalize.test.ts`
Expected: FAIL, thiếu module.

- [ ] **Step 3: Cài đặt**

`src/features/dictionary/normalize.ts`:

```ts
export function normalizeHeadword(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function push(out: string[], w: string) {
  if (w.length >= 2 && !out.includes(w)) out.push(w);
}

export function candidateForms(input: string): string[] {
  const w = normalizeHeadword(input);
  const out: string[] = [];
  push(out, w);
  if (w.length < 4) return out;

  if (w.endsWith("ies")) push(out, w.slice(0, -3) + "y");
  if (w.endsWith("es")) push(out, w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) push(out, w.slice(0, -1));

  if (w.endsWith("ied")) push(out, w.slice(0, -3) + "y");
  if (w.endsWith("ed")) {
    const stem = w.slice(0, -2);
    push(out, stem);
    push(out, stem + "e");
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(out, stem.slice(0, -1));
  }

  if (w.endsWith("ing")) {
    const stem = w.slice(0, -3);
    push(out, stem);
    push(out, stem + "e");
    if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) push(out, stem.slice(0, -1));
  }
  return out;
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/features/dictionary/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dictionary
git commit -m "feat: chuẩn hóa từ và sinh dạng gốc để tra từ điển"
```

---

### Task 6: Parse từ điển StarDict Anh-Việt

Nguồn từ điển: bộ Anh-Việt của Hồ Ngọc Đức (Free Vietnamese Dictionary Project, giấy phép GPL), phân phối dạng StarDict gồm 3 file: `*.ifo`, `*.idx`, `*.dict.dz` (hoặc `*.dict`). Nội dung mỗi mục theo định dạng:

```
@abandon /ə'bændən/
* danh từ
- sự phóng túng, sự tự do
* ngoại động từ
- bỏ, từ bỏ
=to abandon oneself to despair+ chán nản, thất vọng
```

**Files:**
- Create: `src/features/dictionary/parse-stardict.ts`, `src/features/dictionary/parse-stardict.test.ts`
- Create: `prisma/seed/fixtures/sample.dict` (text), `prisma/seed/fixtures/sample.idx` (được sinh trong test)

**Interfaces:**
- Produces:
  - `parseIdx(buf: Buffer): { word: string; offset: number; size: number }[]`
  - `parseEntry(text: string): ParsedEntry | null` với `ParsedEntry = { headword: string; phonetic: string | null; pos: string | null; meaningVi: string; exampleEn: string | null; exampleVi: string | null }`
  - `readDictFile(path: string): Buffer` – tự gunzip nếu đuôi `.dz`.

- [ ] **Step 1: Test**

`src/features/dictionary/parse-stardict.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseIdx, parseEntry } from "./parse-stardict";

function idxOf(entries: { word: string; offset: number; size: number }[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) {
    const w = Buffer.from(e.word, "utf8");
    const nums = Buffer.alloc(8);
    nums.writeUInt32BE(e.offset, 0);
    nums.writeUInt32BE(e.size, 4);
    parts.push(w, Buffer.from([0]), nums);
  }
  return Buffer.concat(parts);
}

describe("parseIdx", () => {
  it("đọc word, offset, size big-endian", () => {
    const buf = idxOf([
      { word: "abandon", offset: 0, size: 120 },
      { word: "ability", offset: 120, size: 50 },
    ]);
    expect(parseIdx(buf)).toEqual([
      { word: "abandon", offset: 0, size: 120 },
      { word: "ability", offset: 120, size: 50 },
    ]);
  });
});

describe("parseEntry", () => {
  const text = `@abandon /ə'bændən/
* danh từ
- sự phóng túng, sự tự do
* ngoại động từ
- bỏ, từ bỏ
=to abandon oneself to despair+ chán nản, thất vọng`;

  it("lấy headword, phonetic, pos đầu, nghĩa đầu, ví dụ", () => {
    expect(parseEntry(text)).toEqual({
      headword: "abandon",
      phonetic: "ə'bændən",
      pos: "danh từ",
      meaningVi: "sự phóng túng, sự tự do; bỏ, từ bỏ",
      exampleEn: "to abandon oneself to despair",
      exampleVi: "chán nản, thất vọng",
    });
  });

  it("không có phonetic và ví dụ", () => {
    expect(parseEntry("@zip code\n* danh từ\n- mã bưu điện")).toEqual({
      headword: "zip code",
      phonetic: null,
      pos: "danh từ",
      meaningVi: "mã bưu điện",
      exampleEn: null,
      exampleVi: null,
    });
  });

  it("không có nghĩa thì trả null", () => {
    expect(parseEntry("@foo\n* danh từ")).toBeNull();
  });

  it("giới hạn tối đa 3 nghĩa", () => {
    const t = "@x\n* n\n- a\n- b\n- c\n- d";
    expect(parseEntry(t)?.meaningVi).toBe("a; b; c");
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/features/dictionary/parse-stardict.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt**

`src/features/dictionary/parse-stardict.ts`:

```ts
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

export type IdxEntry = { word: string; offset: number; size: number };

export function parseIdx(buf: Buffer): IdxEntry[] {
  const out: IdxEntry[] = [];
  let i = 0;
  while (i < buf.length) {
    const end = buf.indexOf(0, i);
    if (end === -1) break;
    const word = buf.subarray(i, end).toString("utf8");
    const offset = buf.readUInt32BE(end + 1);
    const size = buf.readUInt32BE(end + 5);
    out.push({ word, offset, size });
    i = end + 9;
  }
  return out;
}

export function readDictFile(path: string): Buffer {
  const raw = readFileSync(path);
  return path.endsWith(".dz") ? gunzipSync(raw) : raw;
}

export type ParsedEntry = {
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  exampleEn: string | null;
  exampleVi: string | null;
};

export function parseEntry(text: string): ParsedEntry | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const head = lines.find((l) => l.startsWith("@"));
  if (!head) return null;

  const m = /^@(.+?)(?:\s+\/(.+?)\/)?\s*$/.exec(head);
  if (!m) return null;
  const headword = m[1].trim();
  const phonetic = m[2]?.trim() ?? null;

  let pos: string | null = null;
  const meanings: string[] = [];
  let exampleEn: string | null = null;
  let exampleVi: string | null = null;

  for (const l of lines) {
    if (l.startsWith("* ") && pos === null) pos = l.slice(2).trim();
    else if (l.startsWith("- ") && meanings.length < 3) meanings.push(l.slice(2).trim());
    else if (l.startsWith("=") && exampleEn === null) {
      const [en, vi] = l.slice(1).split("+");
      exampleEn = en.trim();
      exampleVi = vi?.trim() ?? null;
    }
  }
  if (meanings.length === 0) return null;
  return { headword, phonetic, pos, meaningVi: meanings.join("; "), exampleEn, exampleVi };
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/features/dictionary/parse-stardict.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dictionary/parse-stardict.ts src/features/dictionary/parse-stardict.test.ts
git commit -m "feat: parse StarDict idx/dict và định dạng từ điển Anh-Việt"
```

---

### Task 7: Script nhập từ điển vào bảng Word

**Files:**
- Create: `prisma/seed/import-stardict.ts`
- Create: `prisma/seed/fixtures/README.md` (hướng dẫn tải từ điển)
- Modify: `package.json` (script `db:import-dict`)

**Interfaces:**
- Consumes: `parseIdx`, `readDictFile`, `parseEntry`, `normalizeHeadword`, `prisma`.
- Produces: bảng `Word` có dữ liệu. Lệnh: `npm run db:import-dict -- <path-khong-duoi>` (ví dụ `data/star_anhviet`, script tự thêm `.idx` và `.dict.dz` hoặc `.dict`).

- [ ] **Step 1: Hướng dẫn tải**

`prisma/seed/fixtures/README.md`:

```md
# Từ điển Anh-Việt

Tải bộ StarDict "Anh-Việt" của Hồ Ngọc Đức (Free Vietnamese Dictionary Project, GPL).
Tìm gói `stardict-dictd_anh-viet` hoặc `star_anhviet` trên các kho StarDict công khai.

Giải nén vào thư mục `data/` (đã gitignore), ví dụ:

data/star_anhviet.ifo
data/star_anhviet.idx
data/star_anhviet.dict.dz

Chạy: `npm run db:import-dict -- data/star_anhviet`
```

Thêm `data/` vào `.gitignore`.

- [ ] **Step 2: Script**

`prisma/seed/import-stardict.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { parseIdx, readDictFile, parseEntry } from "../../src/features/dictionary/parse-stardict";
import { normalizeHeadword } from "../../src/features/dictionary/normalize";

const prisma = new PrismaClient();

async function main() {
  const base = process.argv[2];
  if (!base) throw new Error("Cách dùng: npm run db:import-dict -- <path-khong-duoi>");
  const idxPath = `${base}.idx`;
  const dictPath = existsSync(`${base}.dict.dz`) ? `${base}.dict.dz` : `${base}.dict`;
  const idx = parseIdx(readFileSync(idxPath));
  const dict = readDictFile(dictPath);
  console.log(`Đọc ${idx.length} mục từ ${idxPath}`);

  const seen = new Set<string>();
  let batch: Parameters<typeof prisma.word.createMany>[0]["data"] = [];
  let inserted = 0;

  for (const e of idx) {
    const text = dict.subarray(e.offset, e.offset + e.size).toString("utf8");
    const parsed = parseEntry(text);
    if (!parsed) continue;
    const headword = normalizeHeadword(parsed.headword);
    if (!headword || seen.has(headword)) continue;
    seen.add(headword);
    batch.push({
      headword,
      phonetic: parsed.phonetic,
      pos: parsed.pos,
      meaningVi: parsed.meaningVi,
      exampleEn: parsed.exampleEn,
      exampleVi: parsed.exampleVi,
    });
    if (batch.length >= 2000) {
      const r = await prisma.word.createMany({ data: batch, skipDuplicates: true });
      inserted += r.count;
      batch = [];
      process.stdout.write(`\rĐã chèn ${inserted}`);
    }
  }
  if (batch.length) {
    const r = await prisma.word.createMany({ data: batch, skipDuplicates: true });
    inserted += r.count;
  }
  console.log(`\nXong. Tổng chèn: ${inserted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Thêm script vào `package.json`:

```json
"db:import-dict": "tsx prisma/seed/import-stardict.ts"
```

- [ ] **Step 3: Chạy nhập thật**

Tải từ điển theo README, rồi:

Run: `npm run db:import-dict -- data/star_anhviet`
Expected: in số mục đọc và số dòng chèn (khoảng vài chục nghìn đến hơn 100 nghìn). Kiểm tra bằng `npx prisma studio` thấy bảng Word có dữ liệu, từ `abandon` có nghĩa.

Nếu chưa tải được từ điển, tạo file text nhỏ để thử: ghi `data/mini.dict` với 3 mục theo định dạng `@...`, và sinh `data/mini.idx` bằng đoạn script tạm dùng hàm `idxOf` giống trong test. Bước này chỉ để xác nhận script chạy.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed package.json .gitignore
git commit -m "feat: script nhập từ điển StarDict vào bảng Word"
```

---

### Task 8: Tra từ trong bảng Word

**Files:**
- Create: `src/features/dictionary/lookup.ts`, `src/features/dictionary/lookup.test.ts`

**Interfaces:**
- Consumes: `candidateForms`.
- Produces: `lookupWord(db: Pick<PrismaClient, "word">, raw: string): Promise<WordDto | null>` với `WordDto = { id: string; headword: string; phonetic: string | null; pos: string | null; meaningVi: string; exampleEn: string | null; exampleVi: string | null }`. Ưu tiên khớp đúng từ, sau đó dạng gốc theo thứ tự `candidateForms`.

- [ ] **Step 1: Test**

`src/features/dictionary/lookup.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { lookupWord } from "./lookup";

const words = [
  { id: "1", headword: "book", phonetic: "buk", pos: "danh từ", meaningVi: "sách", exampleEn: null, exampleVi: null },
  { id: "2", headword: "books", phonetic: null, pos: "danh từ", meaningVi: "sổ sách", exampleEn: null, exampleVi: null },
  { id: "3", headword: "run", phonetic: null, pos: "động từ", meaningVi: "chạy", exampleEn: null, exampleVi: null },
];

const db = {
  word: {
    findMany: vi.fn(async ({ where }: { where: { headword: { in: string[] } } }) =>
      words.filter((w) => where.headword.in.includes(w.headword))
    ),
  },
};

describe("lookupWord", () => {
  it("khớp đúng từ được ưu tiên hơn dạng gốc", async () => {
    expect((await lookupWord(db as never, "Books"))?.id).toBe("2");
  });
  it("tra được qua dạng gốc", async () => {
    expect((await lookupWord(db as never, "running"))?.id).toBe("3");
  });
  it("không có thì null", async () => {
    expect(await lookupWord(db as never, "xyzzy")).toBeNull();
  });
  it("chuỗi nhiều từ thì null", async () => {
    expect(await lookupWord(db as never, "run fast")).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/features/dictionary/lookup.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt**

`src/features/dictionary/lookup.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import { candidateForms } from "./normalize";

export type WordDto = {
  id: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  exampleEn: string | null;
  exampleVi: string | null;
};

export async function lookupWord(db: Pick<PrismaClient, "word">, raw: string): Promise<WordDto | null> {
  if (/\s/.test(raw.trim())) return null;
  const forms = candidateForms(raw);
  if (forms.length === 0) return null;
  const rows = await db.word.findMany({
    where: { headword: { in: forms } },
    select: { id: true, headword: true, phonetic: true, pos: true, meaningVi: true, exampleEn: true, exampleVi: true },
  });
  for (const f of forms) {
    const hit = rows.find((r) => r.headword === f);
    if (hit) return hit;
  }
  return null;
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/features/dictionary/lookup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dictionary/lookup.ts src/features/dictionary/lookup.test.ts
git commit -m "feat: tra từ trong bảng Word theo dạng gốc"
```

---

### Task 9: Phát hiện chiều dịch và TranslateProvider (LibreTranslate)

**Files:**
- Create: `src/features/translate/direction.ts`, `src/features/translate/direction.test.ts`
- Create: `src/lib/providers/translate/types.ts`, `src/lib/providers/translate/libretranslate.ts`, `src/lib/providers/translate/libretranslate.test.ts`

**Interfaces:**
- Produces:
  - `type Lang = "en" | "vi"`; `detectDirection(text: string): { from: Lang; to: Lang }`
  - `interface TranslateProvider { translate(text: string, from: Lang, to: Lang): Promise<string> }`
  - `createLibreTranslate(opts: { baseUrl: string; fetchFn?: typeof fetch; timeoutMs?: number }): TranslateProvider` – ném `Error("TRANSLATE_UNAVAILABLE")` khi lỗi mạng, timeout hoặc HTTP không 2xx.

- [ ] **Step 1: Test chiều dịch**

`src/features/translate/direction.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectDirection } from "./direction";

describe("detectDirection", () => {
  it("có dấu tiếng Việt thì vi -> en", () => {
    expect(detectDirection("hoãn cuộc họp")).toEqual({ from: "vi", to: "en" });
    expect(detectDirection("Đường")).toEqual({ from: "vi", to: "en" });
  });
  it("không dấu thì en -> vi", () => {
    expect(detectDirection("postpone the meeting")).toEqual({ from: "en", to: "vi" });
  });
});
```

- [ ] **Step 2: Cài đặt chiều dịch**

`src/features/translate/direction.ts`:

```ts
export type Lang = "en" | "vi";

const VI_CHARS = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;

export function detectDirection(text: string): { from: Lang; to: Lang } {
  return VI_CHARS.test(text) ? { from: "vi", to: "en" } : { from: "en", to: "vi" };
}
```

Run: `npx vitest run src/features/translate/direction.test.ts`
Expected: PASS.

- [ ] **Step 3: Test provider**

`src/lib/providers/translate/libretranslate.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createLibreTranslate } from "./libretranslate";

describe("createLibreTranslate", () => {
  it("gọi POST /translate và trả translatedText", async () => {
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("http://lt/translate");
      expect(JSON.parse(String(init.body))).toEqual({ q: "hello", source: "en", target: "vi", format: "text" });
      return new Response(JSON.stringify({ translatedText: "xin chào" }), { status: 200 });
    });
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    expect(await p.translate("hello", "en", "vi")).toBe("xin chào");
  });

  it("HTTP lỗi thì ném TRANSLATE_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 500 }));
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    await expect(p.translate("x", "en", "vi")).rejects.toThrow("TRANSLATE_UNAVAILABLE");
  });

  it("lỗi mạng thì ném TRANSLATE_UNAVAILABLE", async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError("fetch failed"); });
    const p = createLibreTranslate({ baseUrl: "http://lt", fetchFn: fetchFn as never });
    await expect(p.translate("x", "en", "vi")).rejects.toThrow("TRANSLATE_UNAVAILABLE");
  });
});
```

- [ ] **Step 4: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/lib/providers/translate`
Expected: FAIL.

- [ ] **Step 5: Cài đặt provider**

`src/lib/providers/translate/types.ts`:

```ts
import type { Lang } from "@/features/translate/direction";

export interface TranslateProvider {
  translate(text: string, from: Lang, to: Lang): Promise<string>;
}
```

`src/lib/providers/translate/libretranslate.ts`:

```ts
import type { Lang } from "@/features/translate/direction";
import type { TranslateProvider } from "./types";

export function createLibreTranslate(opts: {
  baseUrl: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): TranslateProvider {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 5000;
  const base = opts.baseUrl.replace(/\/$/, "");

  return {
    async translate(text: string, from: Lang, to: Lang): Promise<string> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchFn(`${base}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("TRANSLATE_UNAVAILABLE");
        const data = (await res.json()) as { translatedText?: string };
        if (typeof data.translatedText !== "string") throw new Error("TRANSLATE_UNAVAILABLE");
        return data.translatedText;
      } catch {
        throw new Error("TRANSLATE_UNAVAILABLE");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
```

- [ ] **Step 6: Chạy test, mong đợi PASS**

Run: `npx vitest run src/lib/providers/translate src/features/translate`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/translate src/lib/providers
git commit -m "feat: phát hiện chiều dịch và provider LibreTranslate"
```

---

### Task 10: Nghiệp vụ dịch: từ điển, cache, provider

**Files:**
- Create: `src/features/translate/translate.ts`, `src/features/translate/translate.test.ts`

**Interfaces:**
- Consumes: `lookupWord`, `detectDirection`, `TranslateProvider`.
- Produces:
  - `type TranslateResult = { kind: "word"; word: WordDto; from: "en"; to: "vi" } | { kind: "text"; from: Lang; to: Lang; result: string } | { kind: "unavailable"; from: Lang; to: Lang }`
  - `translateText(deps: { db: Pick<PrismaClient, "word" | "translationCache">; provider: TranslateProvider }, rawText: string): Promise<TranslateResult>`
  - `cacheKey(text: string, from: Lang, to: Lang): string` (sha256 hex).
  - Ném `Error("TEXT_TOO_LONG")` nếu quá 500 ký tự sau trim, `Error("EMPTY")` nếu rỗng.

- [ ] **Step 1: Test**

`src/features/translate/translate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { translateText, cacheKey } from "./translate";

const word = { id: "1", headword: "book", phonetic: null, pos: "danh từ", meaningVi: "sách", exampleEn: null, exampleVi: null };

function makeDeps(cacheRows: Record<string, string> = {}) {
  const db = {
    word: {
      findMany: vi.fn(async ({ where }: { where: { headword: { in: string[] } } }) =>
        where.headword.in.includes("book") ? [word] : []
      ),
    },
    translationCache: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) =>
        cacheRows[where.key] ? { key: where.key, result: cacheRows[where.key] } : null
      ),
      create: vi.fn(async () => ({})),
    },
  };
  const provider = { translate: vi.fn(async (t: string) => `[dịch] ${t}`) };
  return { db, provider };
}

describe("translateText", () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it("từ đơn có trong từ điển thì trả kind word, không gọi provider", async () => {
    const r = await translateText(deps as never, " Books ");
    expect(r).toEqual({ kind: "word", word, from: "en", to: "vi" });
    expect(deps.provider.translate).not.toHaveBeenCalled();
  });

  it("cụm từ thì gọi provider và ghi cache", async () => {
    const r = await translateText(deps as never, "postpone the meeting");
    expect(r).toEqual({ kind: "text", from: "en", to: "vi", result: "[dịch] postpone the meeting" });
    expect(deps.db.translationCache.create).toHaveBeenCalledOnce();
  });

  it("có cache thì không gọi provider", async () => {
    const key = cacheKey("xin chào", "vi", "en");
    deps = makeDeps({ [key]: "hello" });
    const r = await translateText(deps as never, "xin chào");
    expect(r).toEqual({ kind: "text", from: "vi", to: "en", result: "hello" });
    expect(deps.provider.translate).not.toHaveBeenCalled();
  });

  it("provider lỗi thì kind unavailable", async () => {
    deps.provider.translate.mockRejectedValueOnce(new Error("TRANSLATE_UNAVAILABLE"));
    const r = await translateText(deps as never, "some phrase here");
    expect(r).toEqual({ kind: "unavailable", from: "en", to: "vi" });
  });

  it("từ chối rỗng và quá dài", async () => {
    await expect(translateText(deps as never, "   ")).rejects.toThrow("EMPTY");
    await expect(translateText(deps as never, "a".repeat(501))).rejects.toThrow("TEXT_TOO_LONG");
  });

  it("cacheKey không phân biệt hoa thường và khoảng trắng hai đầu", () => {
    expect(cacheKey(" Hello ", "en", "vi")).toBe(cacheKey("hello", "en", "vi"));
    expect(cacheKey("hello", "en", "vi")).not.toBe(cacheKey("hello", "vi", "en"));
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/features/translate/translate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Cài đặt**

`src/features/translate/translate.ts`:

```ts
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { lookupWord, type WordDto } from "@/features/dictionary/lookup";
import { detectDirection, type Lang } from "./direction";
import type { TranslateProvider } from "@/lib/providers/translate/types";

export const MAX_TEXT_LENGTH = 500;

export type TranslateResult =
  | { kind: "word"; word: WordDto; from: "en"; to: "vi" }
  | { kind: "text"; from: Lang; to: Lang; result: string }
  | { kind: "unavailable"; from: Lang; to: Lang };

export type TranslateDeps = {
  db: Pick<PrismaClient, "word" | "translationCache">;
  provider: TranslateProvider;
};

export function cacheKey(text: string, from: Lang, to: Lang): string {
  return createHash("sha256").update(`${from}:${to}:${text.trim().toLowerCase()}`).digest("hex");
}

export async function translateText(deps: TranslateDeps, rawText: string): Promise<TranslateResult> {
  const text = rawText.trim().replace(/\s+/g, " ");
  if (!text) throw new Error("EMPTY");
  if (text.length > MAX_TEXT_LENGTH) throw new Error("TEXT_TOO_LONG");

  const { from, to } = detectDirection(text);

  if (from === "en" && !/\s/.test(text)) {
    const word = await lookupWord(deps.db, text);
    if (word) return { kind: "word", word, from: "en", to: "vi" };
  }

  const key = cacheKey(text, from, to);
  const cached = await deps.db.translationCache.findUnique({ where: { key } });
  if (cached) return { kind: "text", from, to, result: cached.result };

  try {
    const result = await deps.provider.translate(text, from, to);
    await deps.db.translationCache.create({ data: { key, text, from, to, result } });
    return { kind: "text", from, to, result };
  } catch {
    return { kind: "unavailable", from, to };
  }
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/features/translate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/translate
git commit -m "feat: nghiệp vụ dịch với từ điển, cache và provider"
```

---

### Task 11: Lưu từ vào UserWord

**Files:**
- Create: `src/features/vocab/save-word.ts`, `src/features/vocab/save-word.test.ts`

**Interfaces:**
- Produces: `saveWord(db: Pick<PrismaClient, "userWord">, input: { userId: string; wordId: string; sourceContext?: string }): Promise<{ created: boolean }>` – dùng upsert, không đổi tiến độ SM-2 nếu đã có; `sourceContext` cắt tối đa 300 ký tự.

- [ ] **Step 1: Test**

`src/features/vocab/save-word.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { saveWord } from "./save-word";

describe("saveWord", () => {
  it("tạo mới khi chưa có", async () => {
    const db = {
      userWord: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({})),
      },
    };
    const r = await saveWord(db as never, { userId: "u", wordId: "w", sourceContext: "x".repeat(400) });
    expect(r).toEqual({ created: true });
    const data = db.userWord.create.mock.calls[0][0].data;
    expect(data.sourceContext.length).toBe(300);
    expect(data.userId).toBe("u");
  });

  it("đã có thì không tạo lại", async () => {
    const db = {
      userWord: {
        findUnique: vi.fn(async () => ({ id: "uw" })),
        create: vi.fn(),
      },
    };
    const r = await saveWord(db as never, { userId: "u", wordId: "w" });
    expect(r).toEqual({ created: false });
    expect(db.userWord.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/features/vocab`
Expected: FAIL.

- [ ] **Step 3: Cài đặt**

`src/features/vocab/save-word.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

export async function saveWord(
  db: Pick<PrismaClient, "userWord">,
  input: { userId: string; wordId: string; sourceContext?: string }
): Promise<{ created: boolean }> {
  const existing = await db.userWord.findUnique({
    where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
  });
  if (existing) return { created: false };
  await db.userWord.create({
    data: {
      userId: input.userId,
      wordId: input.wordId,
      sourceContext: input.sourceContext?.slice(0, 300) ?? null,
    },
  });
  return { created: true };
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/features/vocab`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/vocab
git commit -m "feat: lưu từ vào UserWord"
```

---

### Task 12: API `/api/translate` và `/api/vocab/save`

**Files:**
- Create: `src/lib/providers/translate/index.ts` (factory theo env)
- Create: `src/app/api/translate/route.ts`, `src/app/api/translate/route.test.ts`
- Create: `src/app/api/vocab/save/route.ts`

**Interfaces:**
- Consumes: `translateText`, `saveWord`, `auth`, `prisma`.
- Produces:
  - `POST /api/translate` body `{ text: string }` trả `TranslateResult & { canSave: boolean }`; 400 nếu rỗng hoặc quá dài.
  - `POST /api/vocab/save` body `{ wordId: string; context?: string }` trả `{ created: boolean }`; 401 nếu chưa đăng nhập.

- [ ] **Step 1: Factory provider**

`src/lib/providers/translate/index.ts`:

```ts
import { createLibreTranslate } from "./libretranslate";
import type { TranslateProvider } from "./types";

let cached: TranslateProvider | null = null;

export function getTranslateProvider(): TranslateProvider {
  if (!cached) {
    cached = createLibreTranslate({ baseUrl: process.env.LIBRETRANSLATE_URL ?? "http://localhost:5000" });
  }
  return cached;
}
```

- [ ] **Step 2: Test route translate (mock nghiệp vụ và auth)**

`src/app/api/translate/route.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", role: "USER" } })) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/providers/translate", () => ({ getTranslateProvider: () => ({ translate: vi.fn() }) }));
vi.mock("@/features/translate/translate", async (orig) => {
  const mod = await orig<typeof import("@/features/translate/translate")>();
  return {
    ...mod,
    translateText: vi.fn(async (_deps: unknown, text: string) => {
      if (!text.trim()) throw new Error("EMPTY");
      if (text.length > 500) throw new Error("TEXT_TOO_LONG");
      return { kind: "text", from: "en", to: "vi", result: "ok" };
    }),
  };
});

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/translate", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/translate", () => {
  it("trả kết quả và canSave=true khi đã đăng nhập", async () => {
    const res = await POST(req({ text: "hello world" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: "text", from: "en", to: "vi", result: "ok", canSave: true });
  });
  it("400 khi rỗng", async () => {
    expect((await POST(req({ text: "  " }))).status).toBe(400);
  });
  it("400 khi quá dài", async () => {
    expect((await POST(req({ text: "a".repeat(501) }))).status).toBe(400);
  });
  it("400 khi body sai", async () => {
    expect((await POST(req({ nope: 1 }))).status).toBe(400);
  });
});
```

- [ ] **Step 3: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/app/api/translate`
Expected: FAIL.

- [ ] **Step 4: Cài đặt route translate**

`src/app/api/translate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslateProvider } from "@/lib/providers/translate";
import { translateText } from "@/features/translate/translate";

const bodySchema = z.object({ text: z.string() });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

  const session = await auth();
  try {
    const result = await translateText({ db: prisma, provider: getTranslateProvider() }, parsed.data.text);
    return NextResponse.json({ ...result, canSave: Boolean(session?.user?.id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "EMPTY" || msg === "TEXT_TOO_LONG") return NextResponse.json({ error: msg }, { status: 400 });
    throw e;
  }
}
```

- [ ] **Step 5: Route lưu từ**

`src/app/api/vocab/save/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWord } from "@/features/vocab/save-word";

const bodySchema = z.object({ wordId: z.string().min(1), context: z.string().max(1000).optional() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const r = await saveWord(prisma, { userId: session.user.id, wordId: parsed.data.wordId, sourceContext: parsed.data.context });
  return NextResponse.json(r);
}
```

- [ ] **Step 6: Chạy test, mong đợi PASS**

Run: `npx vitest run src/app/api`
Expected: PASS.

- [ ] **Step 7: Kiểm tra thủ công với LibreTranslate thật**

```bash
docker compose up -d libretranslate
```

Lần đầu LibreTranslate tải model en và vi, chờ đến khi `http://localhost:5000` mở được. Sau đó với `npm run dev` đang chạy:

```bash
curl -s -X POST http://localhost:3000/api/translate -H "Content-Type: application/json" -d "{\"text\":\"postpone the meeting\"}"
curl -s -X POST http://localhost:3000/api/translate -H "Content-Type: application/json" -d "{\"text\":\"postpone\"}"
```

Expected: lệnh đầu trả `kind: "text"` với `result` tiếng Việt; lệnh sau trả `kind: "word"` với nghĩa từ điển (nếu đã nhập từ điển ở Task 7).

- [ ] **Step 8: Commit**

```bash
git add src/app/api src/lib/providers/translate/index.ts
git commit -m "feat: API dịch và lưu từ"
```

---

### Task 13: Hook theo dõi bôi đen văn bản

**Files:**
- Create: `src/components/translate-popup/use-selection.ts`, `src/components/translate-popup/selection-utils.ts`, `src/components/translate-popup/selection-utils.test.ts`

**Interfaces:**
- Produces:
  - `isSelectableTarget(node: Node | null): boolean` – false nếu nằm trong `input`, `textarea`, `[contenteditable]`, `[data-no-translate]`, hoặc trong chính popup `[data-translate-popup]`.
  - `type SelectionInfo = { text: string; rect: { top: number; left: number; width: number; height: number }; context: string }`
  - `useSelection(): SelectionInfo | null` – cập nhật sau `mouseup`/`touchend`, debounce 150ms, trả null khi bấm ra ngoài hoặc bôi rỗng. `context` là nội dung text của phần tử khối gần nhất chứa vùng bôi (cắt 300 ký tự).

- [ ] **Step 1: Test tiện ích**

`src/components/translate-popup/selection-utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isSelectableTarget, blockContext } from "./selection-utils";

function html(s: string) {
  document.body.innerHTML = s;
  return document.body;
}

describe("isSelectableTarget", () => {
  it("false trong input/textarea/contenteditable", () => {
    html(`<input id="i"><textarea id="t"></textarea><div contenteditable id="c"><span id="cs">x</span></div>`);
    expect(isSelectableTarget(document.getElementById("i"))).toBe(false);
    expect(isSelectableTarget(document.getElementById("t"))).toBe(false);
    expect(isSelectableTarget(document.getElementById("cs"))).toBe(false);
  });
  it("false trong data-no-translate và trong popup", () => {
    html(`<div data-no-translate><p id="p">x</p></div><div data-translate-popup><b id="b">y</b></div>`);
    expect(isSelectableTarget(document.getElementById("p"))).toBe(false);
    expect(isSelectableTarget(document.getElementById("b"))).toBe(false);
  });
  it("true với text thường", () => {
    html(`<p id="p">hello <em id="e">world</em></p>`);
    expect(isSelectableTarget(document.getElementById("e")!.firstChild)).toBe(true);
  });
  it("null thì false", () => {
    expect(isSelectableTarget(null)).toBe(false);
  });
});

describe("blockContext", () => {
  it("lấy text của phần tử khối gần nhất, cắt 300 ký tự", () => {
    html(`<div><p id="p">The committee will <b id="b">postpone</b> the meeting.</p></div>`);
    expect(blockContext(document.getElementById("b")!.firstChild)).toBe("The committee will postpone the meeting.");
    html(`<p id="p">${"a".repeat(400)}</p>`);
    expect(blockContext(document.getElementById("p")!.firstChild)!.length).toBe(300);
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/components/translate-popup`
Expected: FAIL.

- [ ] **Step 3: Cài đặt tiện ích**

`src/components/translate-popup/selection-utils.ts`:

```ts
const BLOCKED = "input, textarea, [contenteditable], [data-no-translate], [data-translate-popup]";

export function isSelectableTarget(node: Node | null): boolean {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return false;
  return el.closest(BLOCKED) === null;
}

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "TD", "TH", "BLOCKQUOTE", "ARTICLE", "SECTION", "H1", "H2", "H3", "H4", "H5", "H6", "MAIN", "BODY"]);

export function blockContext(node: Node | null): string | null {
  let el: Element | null = node ? (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement) : null;
  while (el && !BLOCK_TAGS.has(el.tagName)) el = el.parentElement;
  const text = el?.textContent?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 300) : null;
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/components/translate-popup`
Expected: PASS.

- [ ] **Step 5: Hook**

`src/components/translate-popup/use-selection.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { isSelectableTarget, blockContext } from "./selection-utils";

export type SelectionInfo = {
  text: string;
  rect: { top: number; left: number; width: number; height: number };
  context: string;
};

export function useSelection(): SelectionInfo | null {
  const [info, setInfo] = useState<SelectionInfo | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const read = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return setInfo(null);
      const text = sel.toString().trim();
      if (!text || text.length > 500) return setInfo(null);
      if (!isSelectableTarget(sel.anchorNode) || !isSelectableTarget(sel.focusNode)) return setInfo(null);
      const range = sel.getRangeAt(0);
      const r = range.getBoundingClientRect();
      setInfo({
        text,
        rect: { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height },
        context: blockContext(sel.anchorNode) ?? text,
      });
    };

    const onUp = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(read, 150);
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-translate-popup]")) return;
      setInfo(null);
    };

    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  return info;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/translate-popup
git commit -m "feat: hook theo dõi bôi đen văn bản cho popup dịch"
```

---

### Task 14: Component TranslatePopup và gắn vào layout

**Files:**
- Create: `src/components/translate-popup/TranslatePopup.tsx`, `src/components/translate-popup/TranslatePopup.test.tsx`
- Create: `src/components/translate-popup/PopupContent.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `useSelection`, `POST /api/translate`, `POST /api/vocab/save`.
- Produces: `<TranslatePopup />` gắn một lần ở root layout. `<PopupContent data={...} context={...} />` là phần hiển thị thuần, nhận dữ liệu qua props để test dễ.

- [ ] **Step 1: Test PopupContent**

`src/components/translate-popup/TranslatePopup.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PopupContent } from "./PopupContent";

const word = { id: "w1", headword: "postpone", phonetic: "pəʊst'pəʊn", pos: "ngoại động từ", meaningVi: "hoãn lại", exampleEn: "to postpone a meeting", exampleVi: "hoãn cuộc họp" };

describe("PopupContent", () => {
  it("hiện nghĩa từ điển, phiên âm, ví dụ và nút lưu khi canSave", async () => {
    const onSave = vi.fn();
    render(<PopupContent data={{ kind: "word", word, from: "en", to: "vi", canSave: true }} context="ctx" onSave={onSave} saveState="idle" />);
    expect(screen.getByText("postpone")).toBeInTheDocument();
    expect(screen.getByText(/pəʊst'pəʊn/)).toBeInTheDocument();
    expect(screen.getByText("hoãn lại")).toBeInTheDocument();
    expect(screen.getByText("to postpone a meeting")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lưu từ" }));
    expect(onSave).toHaveBeenCalledWith("w1", "ctx");
  });

  it("không có nút lưu khi chưa đăng nhập", () => {
    render(<PopupContent data={{ kind: "word", word, from: "en", to: "vi", canSave: false }} context="" onSave={vi.fn()} saveState="idle" />);
    expect(screen.queryByRole("button", { name: "Lưu từ" })).toBeNull();
    expect(screen.getByText(/đăng nhập để lưu/i)).toBeInTheDocument();
  });

  it("hiện bản dịch cụm", () => {
    render(<PopupContent data={{ kind: "text", from: "en", to: "vi", result: "hoãn cuộc họp", canSave: true }} context="" onSave={vi.fn()} saveState="idle" />);
    expect(screen.getByText("hoãn cuộc họp")).toBeInTheDocument();
  });

  it("hiện thông báo khi không dịch được", () => {
    render(<PopupContent data={{ kind: "unavailable", from: "en", to: "vi", canSave: false }} context="" onSave={vi.fn()} saveState="idle" />);
    expect(screen.getByText(/chưa dịch được/i)).toBeInTheDocument();
  });

  it("hiện đã lưu", () => {
    render(<PopupContent data={{ kind: "word", word, from: "en", to: "vi", canSave: true }} context="" onSave={vi.fn()} saveState="saved" />);
    expect(screen.getByText(/đã lưu/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, mong đợi FAIL**

Run: `npx vitest run src/components/translate-popup/TranslatePopup.test.tsx`
Expected: FAIL.

- [ ] **Step 3: PopupContent**

`src/components/translate-popup/PopupContent.tsx`:

```tsx
"use client";

import type { TranslateResult } from "@/features/translate/translate";

export type PopupData = TranslateResult & { canSave: boolean };
export type SaveState = "idle" | "saving" | "saved" | "error";

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function PopupContent({
  data,
  context,
  onSave,
  saveState,
}: {
  data: PopupData;
  context: string;
  onSave: (wordId: string, context: string) => void;
  saveState: SaveState;
}) {
  if (data.kind === "unavailable") {
    return <p className="text-sm text-gray-600">Chưa dịch được. Vui lòng thử lại sau.</p>;
  }

  if (data.kind === "text") {
    return (
      <div className="text-sm">
        <p className="mb-1 text-xs text-gray-500">{data.from === "en" ? "Anh → Việt" : "Việt → Anh"}</p>
        <p>{data.result}</p>
      </div>
    );
  }

  const w = data.word;
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{w.headword}</span>
        {w.phonetic && <span className="text-gray-500">/{w.phonetic}/</span>}
        <button type="button" aria-label="Phát âm" onClick={() => speak(w.headword)} className="rounded border px-1 text-xs">
          🔊
        </button>
      </div>
      {w.pos && <p className="text-xs italic text-gray-500">{w.pos}</p>}
      <p className="mt-1">{w.meaningVi}</p>
      {w.exampleEn && (
        <p className="mt-1 text-xs text-gray-600">
          <span>{w.exampleEn}</span>
          {w.exampleVi && <span> — {w.exampleVi}</span>}
        </p>
      )}
      <div className="mt-2">
        {data.canSave ? (
          saveState === "saved" ? (
            <span className="text-xs text-green-700">Đã lưu vào từ vựng</span>
          ) : (
            <button
              type="button"
              disabled={saveState === "saving"}
              onClick={() => onSave(w.id, context)}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Lưu từ
            </button>
          )
        ) : (
          <span className="text-xs text-gray-500">Đăng nhập để lưu từ</span>
        )}
        {saveState === "error" && <span className="ml-2 text-xs text-red-600">Lưu thất bại</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, mong đợi PASS**

Run: `npx vitest run src/components/translate-popup/TranslatePopup.test.tsx`
Expected: PASS.

- [ ] **Step 5: TranslatePopup (gọi API, định vị)**

`src/components/translate-popup/TranslatePopup.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSelection } from "./use-selection";
import { PopupContent, type PopupData, type SaveState } from "./PopupContent";

const POPUP_WIDTH = 320;

export function TranslatePopup() {
  const sel = useSelection();
  const [data, setData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (!sel) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSaveState("idle");
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sel.text }),
    })
      .then(async (r) => (r.ok ? ((await r.json()) as PopupData) : null))
      .catch(() => null)
      .then((d) => {
        if (cancelled) return;
        setData(d ?? { kind: "unavailable", from: "en", to: "vi", canSave: false });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sel]);

  if (!sel) return null;

  const left = Math.max(8, Math.min(sel.rect.left + sel.rect.width / 2 - POPUP_WIDTH / 2, window.innerWidth - POPUP_WIDTH - 8));
  const top = sel.rect.top - 8;

  const onSave = async (wordId: string, context: string) => {
    setSaveState("saving");
    try {
      const r = await fetch("/api/vocab/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, context }),
      });
      setSaveState(r.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div
      data-translate-popup
      role="dialog"
      aria-label="Dịch"
      style={{ position: "absolute", left, top, width: POPUP_WIDTH, transform: "translateY(-100%)" }}
      className="z-50 rounded-lg border bg-white p-3 shadow-lg"
    >
      {loading || !data ? <p className="text-sm text-gray-500">Đang dịch…</p> : <PopupContent data={data} context={sel.context} onSave={onSave} saveState={saveState} />}
    </div>
  );
}
```

- [ ] **Step 6: Gắn vào root layout**

Sửa `src/app/layout.tsx`: import và đặt `<TranslatePopup />` ngay trước thẻ đóng `</body>`, đồng thời đặt `lang="vi"` cho `<html>`:

```tsx
import { TranslatePopup } from "@/components/translate-popup/TranslatePopup";
// ... trong JSX:
<html lang="vi">
  <body className={...}>
    {children}
    <TranslatePopup />
  </body>
</html>
```

- [ ] **Step 7: Kiểm tra thủ công**

Với `npm run dev`, Postgres, LibreTranslate đang chạy và từ điển đã nhập:

1. Mở trang chủ, bôi đen từ `postpone` trong câu ví dụ. Expected: popup hiện phía trên với phiên âm, nghĩa, nút phát âm; chưa đăng nhập thấy "Đăng nhập để lưu từ".
2. Bôi đen cụm `until further notice`. Expected: popup hiện bản dịch tiếng Việt.
3. Đăng nhập, bôi đen `postpone`, bấm "Lưu từ". Expected: "Đã lưu vào từ vựng"; `npx prisma studio` thấy dòng UserWord.
4. Bôi đen trong ô input ở trang đăng nhập. Expected: không hiện popup.
5. Tắt container LibreTranslate, bôi đen một cụm. Expected: "Chưa dịch được".

- [ ] **Step 8: Build, test toàn bộ, commit**

Run: `npm test && npm run build`
Expected: tất cả PASS, build thành công.

```bash
git add -A
git commit -m "feat: popup dịch khi bôi đen, gắn ở layout gốc"
```

---

### Task 15: README chạy dự án

**Files:**
- Create/Modify: `README.md`

- [ ] **Step 1: Viết README**

Ghi đè `README.md` bằng hướng dẫn ngắn:

```md
# TOEIC Prep

Web luyện thi TOEIC Listening & Reading, kèm từ điển bôi đen dịch, từ vựng ôn tập ngắt quãng, bài đọc song ngữ.

## Chạy lần đầu

1. `cp .env.example .env` và điền `AUTH_SECRET` (`openssl rand -base64 32`).
2. `docker compose up -d` (Postgres và LibreTranslate; LibreTranslate tải model en/vi lần đầu vài phút).
3. `npm install`
4. `npx prisma migrate dev`
5. Tải từ điển theo `prisma/seed/fixtures/README.md`, rồi `npm run db:import-dict -- data/star_anhviet`
6. `npm run dev` và mở http://localhost:3000

## Lệnh

- `npm test` – unit test (Vitest)
- `npm run build` – build production
- `npm run db:studio` – xem database

## Tài liệu

- Thiết kế: `docs/superpowers/specs/`
- Kế hoạch triển khai: `docs/superpowers/plans/`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README hướng dẫn chạy dự án"
```

---

## Sau kế hoạch này

Các kế hoạch tiếp theo (viết khi kế hoạch 1 xong):

- Kế hoạch 2: ngân hàng câu hỏi, nhập từ file, drill, thi thử, chấm điểm (spec bước 3).
- Kế hoạch 3: dashboard, bản đồ điểm yếu, Playwright (spec bước 4).
- Kế hoạch 4: từ vựng, SM-2, trắc nghiệm hai chiều (spec bước 5).
- Kế hoạch 5: đọc song ngữ (spec bước 6).
- Kế hoạch 6: quản trị, tạo nội dung bằng AI, TTS, đề tự động (spec bước 7).
- Kế hoạch 7: dữ liệu ban đầu (spec bước 8).

---

## Việc hoãn lại sau kế hoạch 1 (từ review toàn nhánh)

Kế hoạch 1 đã xong và gộp. Những mục dưới đây được review phát hiện nhưng cố ý hoãn, cần xử lý ở kế hoạch sau.

### Bắt buộc trước khi đưa web lên mạng công khai

- **Giới hạn tần suất `/api/translate`.** API không cần đăng nhập và mỗi lần dịch hụt cache đều ghi thêm một dòng `TranslationCache`. Người lạ có thể gửi liên tục chuỗi 500 ký tự ngẫu nhiên làm nghẽn LibreTranslate và phình database. Cần token bucket theo IP (hoặc theo session khi có) và giới hạn kích thước cache (TTL hoặc dọn định kỳ).
- **Ghim phiên bản image LibreTranslate** trong `docker-compose.yml` thay cho `:latest`.
- **Chỉ đăng ký provider Google khi có `AUTH_GOOGLE_ID`**, và ẩn nút "Đăng nhập bằng Google" khi chưa cấu hình — hiện nút luôn hiện và bấm vào sẽ ra trang lỗi của Google.

### Nên làm khi động vào phần liên quan

- **Chống dò email theo thời gian phản hồi** trong `src/lib/auth.ts`: email không tồn tại trả về ngay, email có thật tốn khoảng 100ms cho bcrypt. So sánh với một hash giả cố định khi không tìm thấy user.
- **Phiên âm dạng `[...]` bị bỏ qua** trong `parseEntry`: 1.403 trên 387.517 mục dùng ngoặc vuông. Sửa regex thành `(?:\s+(?:\/(.+?)\/|\[(.+?)\]))?` rồi nhập lại từ điển.
- **Vai trò ADMIN chỉ nằm trong JWT**: nâng quyền một tài khoản chỉ có hiệu lực sau khi đăng xuất rồi đăng nhập lại. Cần lưu ý ở kế hoạch 7 (trang quản trị).
- **Tách kiểu dùng chung ra khỏi `translate.ts`**: `PopupContent.tsx` import kiểu từ một module có `node:crypto` và Prisma. Hiện an toàn vì là import kiểu, nhưng nên chuyển `TranslateResult`/`WordDto` sang `types.ts` không có import runtime trước khi kế hoạch 4 và 5 dùng lại.
- **`AuthError` nào cũng báo "Sai email hoặc mật khẩu"** trong `src/app/(auth)/actions.ts`: lỗi cấu hình cũng hiện thông báo này. Chỉ nên bắt `e.type === "CredentialsSignin"`, còn lại ghi log.
- **Script nhập từ điển không đếm mục bị bỏ qua**: nên in số mục không parse được và số trùng để phát hiện hồi quy.
- **Popup dịch**: chưa giới hạn vị trí theo chiều dọc (chọn chữ sát mép trên có thể đẩy popup ra ngoài màn hình), chưa đóng bằng phím Esc, và effect phụ thuộc vào định danh đối tượng `sel` nên bôi đen lại cùng một từ vẫn gọi API lần nữa.
- **Cờ `created` của `saveWord` trong tình huống đua hiếm**: nếu Prisma biên dịch `upsert` thành `INSERT ... ON CONFLICT DO UPDATE`, bên thua cuộc đua sẽ không nhận `P2002` mà trả về `{created: true}` dù dòng đã tồn tại. Không gây lỗi 500 và không đụng tiến độ SM-2, nhưng nên kiểm tra bằng test tích hợp thật.
- **Nhãn cho ô nhập ở trang đăng nhập/đăng ký**: hiện chỉ có `placeholder`, thiếu `<label>` hoặc `aria-label`.
- **`@types/bcryptjs` thừa** (bcryptjs 3 đã kèm sẵn kiểu) — gỡ được.
