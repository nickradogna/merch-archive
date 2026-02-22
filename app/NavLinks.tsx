"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

const leftItems: Item[] = [
  { href: "/artists", label: "Artists" },
  { href: "/users", label: "Collectors" },
  { href: "/search", label: "Search" },
  { href: "/collection", label: "My Collection" },
  { href: "/wantlist", label: "Wantlist" },
  { href: "/add", label: "Add" },
];

const rightItems: Item[] = [
  { href: "/profile", label: "Profile" },
  { href: "/login", label: "Login" },
];

export default function NavLinks() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-left">
        <Link href="/" className={`nav-link nav-brand ${pathname === "/" ? "nav-active" : ""}`}>
          Merch Archive
        </Link>

        {leftItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? "nav-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        {rightItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? "nav-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}