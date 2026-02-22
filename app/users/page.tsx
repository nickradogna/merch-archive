"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_collection_public: boolean | null;
  item_count?: number;
};

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      // Load profiles
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id,username,bio,avatar_url,is_collection_public")
        .order("username");

      const rows = (profileRows as Profile[]) || [];

      if (rows.length === 0) {
        setProfiles([]);
        return;
      }

      // Get item counts per user (from a DB view)
const { data: counts } = await supabase
  .from("ownership_counts")
  .select("user_id,item_count")
  .in(
    "user_id",
    rows.map((r) => r.user_id)
  );

const countMap: Record<string, number> = {};
(counts as any[] | null)?.forEach((c) => {
  countMap[c.user_id] = c.item_count || 0;
});

      const merged = rows.map((p) => ({
        ...p,
        item_count: countMap[p.user_id] || 0,
      }));

      setProfiles(merged);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((p) => {
      const text = `${p.username} ${p.bio || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [profiles, query]);

  return (
    <main>
      <h1>Collectors</h1>

      <input
        placeholder="Search collectors…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
          marginTop: 12,
          marginBottom: 16,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
          marginTop: 8,
        }}
      >
        {filtered.map((p) => (
          <a
            key={p.user_id}
            href={`/users/${p.username}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="artist-card"
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 12,
                background: "#fff",
              }}
            >
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={`${p.username} avatar`}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    objectFit: "cover",
                    border: "1px solid #e0e0e0",
                    background: "#f2f2f2",
                    flex: "0 0 auto",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    border: "1px solid #e0e0e0",
                    background: "#f2f2f2",
                    flex: "0 0 auto",
                  }}
                />
              )}

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{p.username}</div>
                <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                  {p.bio || "—"}
                </div>

                <div style={{ fontSize: 12, marginTop: 6, color: "#777" }}>
                  {p.is_collection_public === false
                    ? "Collection private"
                    : `${p.item_count || 0} item${
                        p.item_count === 1 ? "" : "s"
                      }`}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}