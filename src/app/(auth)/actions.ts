"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
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

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
