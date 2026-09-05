"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavUser = { name: string | null; email: string; role: "USER" | "ADMIN" };

type Props = {
  user: NavUser | null;
  signOutAction: () => Promise<void>;
};

const MAIN_LINKS = [
  { href: "/exam", label: "Thi thử" },
  { href: "/drill", label: "Luyện tập" },
  { href: "/vocab", label: "Từ vựng" },
  { href: "/reading", label: "Đọc" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavBar({ user, signOutAction }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = user?.role === "ADMIN" ? [...MAIN_LINKS, { href: "/admin", label: "Quản trị" }] : MAIN_LINKS;

  const linkClass = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive(pathname, href) ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-600 hover:text-white"
    }`;

  const navLinks = links.map((l) => (
    <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={isActive(pathname, l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
      {l.label}
    </Link>
  ));

  const account = user ? (
    <>
      <span className="truncate text-sm text-blue-100" title={user.email}>{user.name || user.email}</span>
      <form action={signOutAction}>
        <button className="rounded-md border border-blue-300 px-3 py-1.5 text-sm text-white hover:bg-blue-600">Đăng xuất</button>
      </form>
    </>
  ) : (
    <>
      <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-white hover:bg-blue-600">Đăng nhập</Link>
      <Link href="/register" className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Đăng ký</Link>
    </>
  );

  return (
    <header className="bg-blue-700 text-white shadow-md" data-no-translate>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Điều hướng chính">
        <Link href="/" className="text-lg font-bold tracking-tight">TOEIC Prep</Link>
        <div className="hidden items-center gap-1 md:flex">{navLinks}</div>
        <div className="hidden items-center gap-3 md:flex">{account}</div>
        <button
          type="button"
          className="rounded-md p-2 hover:bg-blue-600 md:hidden"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
      {open && (
        <div className="border-t border-blue-600 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 py-2">{navLinks}</div>
          <div className="flex items-center gap-3 border-t border-blue-600 pt-3">{account}</div>
        </div>
      )}
    </header>
  );
}
