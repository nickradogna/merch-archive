"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const [myUsername, setMyUsername] = useState<string | null>(null);

useEffect(() => {
  async function loadMe() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setMyUsername(null);
      return;
    }

    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .single();

    setMyUsername(p?.username ?? null);
  }

  loadMe();
}, []);

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
        {rightItems.map((item) => {
  const active =
    item.href === "/profile"
      ? pathname === "/profile" ||
        pathname.startsWith("/profile/") ||
        (myUsername ? pathname === `/u/${myUsername}` : false)
      : isActive(item.href);

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
      </div>
    </nav>
  );
}