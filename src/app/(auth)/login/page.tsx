"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, googleAction } from "../actions";
import { AuthCard, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/layout/AuthCard";

function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  const params = useSearchParams();
  return (
    <AuthCard title="Đăng nhập">
      {params.get("registered") && <p className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">Đăng ký thành công, hãy đăng nhập.</p>}
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Mật khẩu</span>
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className={primaryButtonClass}>Đăng nhập</button>
      </form>
      <form action={googleAction} className="mt-3">
        <button className={secondaryButtonClass}>Đăng nhập bằng Google</button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Chưa có tài khoản? <Link href="/register" className="font-medium text-blue-700 hover:underline">Đăng ký</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
