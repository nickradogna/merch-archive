"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("artists").select("*").order("name");
      setArtists(data || []);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, query]);

  return (
    <main>
      <h1>Artists</h1>

      <input
        placeholder="Search artists…"
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
  {filtered.map((artist) => (
    <a
      key={artist.id}
      href={`/artists/${artist.slug}`}
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
        {artist.photo_url ? (
          <img
            src={artist.photo_url}
            alt={`${artist.name} photo`}
            style={{
              width: 54,
              height: 54,
              borderRadius: 10,
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
              borderRadius: 10,
              border: "1px solid #e0e0e0",
              background: "#f2f2f2",
              display: "grid",
              placeItems: "center",
              color: "#777",
              fontSize: 12,
              flex: "0 0 auto",
            }}
          >
            —
          </div>
        )}

        <div style={{ fontWeight: 600 }}>{artist.name}</div>
      </div>
    </a>
  ))}
</div>
    </main>
  );
}