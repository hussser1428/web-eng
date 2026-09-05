"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "../actions";
import { AuthCard, inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

export default function RegisterPage() {
  const [error, action, pending] = useActionState(registerAction, null);
  return (
    <AuthCard title="Đăng ký" subtitle="Tạo tài khoản trong 10 giây ✨">
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Tên (tùy chọn)</span>
          <input name="name" autoComplete="name" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Mật khẩu (tối thiểu 8 ký tự)</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        {error && <p className="text-sm text-neon-pink">{error}</p>}
        <button disabled={pending} className={primaryButtonClass}>Tạo tài khoản</button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Đã có tài khoản? <Link href="/login" className="font-semibold text-neon-cyan hover:underline">Đăng nhập</Link>
      </p>
    </AuthCard>
  );
}
