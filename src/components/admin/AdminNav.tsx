"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminLink = { href: string; label: string };

type Props = { links: AdminLink[] };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav({ links }: Props) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line pb-3" aria-label="Điều hướng quản trị">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(pathname, l.href) ? "page" : undefined}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            isActive(pathname, l.href) ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
