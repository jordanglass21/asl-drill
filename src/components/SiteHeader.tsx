"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Camera" },
  { href: "/record", label: "Record" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="flex items-baseline justify-between border-b border-rail pb-2.5">
      <Link href="/" className="font-display text-[22px] font-extrabold uppercase tracking-[0.06em] text-cream">
        ASL <span className="text-amber">Drill</span>
      </Link>
      <nav className="flex gap-5 text-xs uppercase tracking-[0.14em]">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`transition-colors hover:text-amber ${pathname === href ? "text-cream" : "text-label"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
