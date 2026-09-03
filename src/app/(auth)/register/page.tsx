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
