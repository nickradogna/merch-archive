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

      <ul style={{ lineHeight: 1.8 }}>
        {filtered.map((artist) => (
          <li key={artist.id}>
            <a href={`/artists/${artist.slug}`} style={{ color: "inherit" }}>
              {artist.name}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}