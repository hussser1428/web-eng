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
    <AuthCard title="Đăng nhập" subtitle="Chào mừng trở lại 👋">
      {params.get("registered") && <p className="mb-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-2 text-sm text-emerald-300">Đăng ký thành công, hãy đăng nhập.</p>}
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Mật khẩu</span>
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        {error && <p className="text-sm text-neon-pink">{error}</p>}
        <button disabled={pending} className={primaryButtonClass}>Đăng nhập</button>
      </form>
      <form action={googleAction} className="mt-3">
        <button className={secondaryButtonClass}>Đăng nhập bằng Google</button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Chưa có tài khoản? <Link href="/register" className="font-semibold text-neon-cyan hover:underline">Đăng ký</Link>
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
