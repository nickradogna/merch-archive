"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

const items: Item[] = [
  { href: "/", label: "Home" },
  { href: "/artists", label: "Artists" },
  { href: "/search", label: "Search" },
  { href: "/collection", label: "My Collection" },
  { href: "/wantlist", label: "Wantlist" },
  { href: "/add", label: "Add" },
  { href: "/users", label: "Collectors" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Primary">
      <Link
        href="/"
        className={`nav-link nav-brand ${pathname === "/" ? "nav-active" : ""}`}
      >
        Merch Archive
      </Link>

      {items
        .filter((i) => i.href !== "/")
        .map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? "nav-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}

      <span className="nav-spacer" />

      <Link
        href="/login"
        className={`nav-link ${pathname === "/login" ? "nav-active" : ""}`}
      >
        Login
      </Link>
    </nav>
  );
}