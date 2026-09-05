import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
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

  try {
    const user = await db.user.create({
      data: { email, name: name ?? null, passwordHash: await hashPassword(password), role: "USER" },
    });
    return { ok: true, userId: user.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "EMAIL_TAKEN" };
    }
    throw e;
  }
}
