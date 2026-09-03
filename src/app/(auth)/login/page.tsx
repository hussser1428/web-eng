"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, googleAction } from "../actions";

function LoginForm() {
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
