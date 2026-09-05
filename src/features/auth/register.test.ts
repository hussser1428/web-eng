import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { registerUser } from "./register";

type CreateData = { email: string; passwordHash: string; role: string; name: string | null };

function fakeDb(existing: { email: string }[] = []) {
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
        existing.find((u) => u.email === where.email) ?? null
      ),
      create: vi.fn(async ({ data }: { data: CreateData }) => ({
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

  it("race: findUnique không thấy nhưng create bị trùng (P2002) thì trả EMAIL_TAKEN", async () => {
    const db = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => {
          throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" });
        }),
      },
    };
    const r = await registerUser(db as never, { email: "a@b.com", password: "abc12345" });
    expect(r).toEqual({ ok: false, error: "EMAIL_TAKEN" });
  });
});
