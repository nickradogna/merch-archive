"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [artists, setArtists] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: artistData } = await supabase
        .from("artists")
        .select("id,name,slug")
        .order("name");

      const { data: designData } = await supabase
        .from("designs")
        .select("id,title,year, artists(name,slug)")
        .order("year", { ascending: false });

      setArtists(artistData || []);
      setDesigns(designData || []);
    }

    load();
  }, []);

  const filteredArtists = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return artists
      .filter((a) => a.name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [artists, q]);

  const filteredDesigns = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return designs
      .filter((d) => `${d.year} ${d.title}`.toLowerCase().includes(query))
      .slice(0, 20);
  }, [designs, q]);

  return (
    <main>
      <h1>Search</h1>

      <input
        placeholder="Search artists, designs, years…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 560,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid #ddd",
          marginTop: 12,
          marginBottom: 18,
        }}
      />

      {q.trim() ? (
        <>
          <h2>Artists</h2>
          {filteredArtists.length ? (
            <ul style={{ lineHeight: 1.8 }}>
              {filteredArtists.map((a) => (
                <li key={a.id}>
                  <a href={`/artists/${a.slug}`} style={{ color: "inherit" }}>
                    {a.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#666" }}>No matching artists.</p>
          )}

          <h2 style={{ marginTop: 18 }}>Designs</h2>
          {filteredDesigns.length ? (
            <ul style={{ lineHeight: 1.8 }}>
              {filteredDesigns.map((d) => (
                <li key={d.id}>
                  <a href={`/designs/${d.id}`} style={{ color: "inherit" }}>
                    <strong>{d.artists?.name}</strong> — {d.year} – {d.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#666" }}>No matching designs.</p>
          )}
        </>
      ) : (
        <p style={{ color: "#666" }}>Start typing to search.</p>
      )}
    </main>
  );
}