"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/camera", label: "Camera" },
  { href: "/results", label: "Results" },
  { href: "/feedback", label: "Feedback" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rail pb-2.5">
      <Link href="/" className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-cream sm:text-[22px]">
        ASL <span className="text-amber">Drill</span>
      </Link>
      <nav className="flex gap-3 signage text-sm sm:gap-5 sm:text-base">
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
