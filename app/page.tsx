"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [stats, setStats] = useState<{
    artists: number | null;
    designs: number | null;
    variants: number | null;
    owned: number | null;
  }>({
    artists: null,
    designs: null,
    variants: null,
    owned: null,
  });

  useEffect(() => {
    async function loadStats() {
      // total artists/designs/variants
      const [{ count: artists }, { count: designs }, { count: variants }] =
        await Promise.all([
          supabase.from("artists").select("id", { count: "exact", head: true }),
          supabase.from("designs").select("id", { count: "exact", head: true }),
          supabase.from("variants").select("id", { count: "exact", head: true }),
        ]);

      // "your collection" count (if signed in)
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      let owned: number | null = null;
      if (userId) {
        const { count } = await supabase
          .from("ownership")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        owned = count ?? 0;
      }

      setStats({
        artists: artists ?? 0,
        designs: designs ?? 0,
        variants: variants ?? 0,
        owned,
      });
    }

    loadStats();
  }, []);

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 14,
            height: 14,
            background: "#111",
            borderRadius: 3,
          }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Merch Archive
        </h1>
      </div>

      <p style={{ marginTop: 14, color: "#666", lineHeight: 1.6, maxWidth: 720 }}>
        A clean, collector-first database for band merch—catalog designs, track variants,
        document your personal items, and preserve the story of how you got them.
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginTop: 18,
          maxWidth: 720,
        }}
      >
        <div className="stat-card">
          <div className="stat-number">{stats.artists ?? "—"}</div>
          <div className="stat-label">Artists</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.designs ?? "—"}</div>
          <div className="stat-label">Designs</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{stats.variants ?? "—"}</div>
          <div className="stat-label">Variants</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {stats.owned === null ? "—" : stats.owned}
          </div>
          <div className="stat-label">In your collection</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
        <a href="/artists">
          <button className="button-primary">Browse artists</button>
        </a>
        <a href="/collection">
          <button>My collection</button>
        </a>
        <a href="/wantlist">
          <button>Wantlist</button>
        </a>
        <a href="/add-artist">
          <button>Add artist</button>
        </a>
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid #eee", paddingTop: 18 }}>
        <p style={{ margin: 0, color: "#777", fontSize: 13, lineHeight: 1.6 }}>
          Minimal by design. Community maintained. Built for collectors.
        </p>
      </div>
    </main>
  );
}