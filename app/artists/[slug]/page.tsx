"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);

  const [artist, setArtist] = useState<any>(null);
  const [designs, setDesigns] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: artistData, error } = await supabase
        .from("artists")
        .select("id,name,slug,photo_url,origin_country,primary_genre")
        .eq("slug", slug)
        .single();

      if (error) {
        setMessage(error.message);
        setArtist(null);
        return;
      }

      setArtist(artistData);

      const { data: designsData } = await supabase
        .from("designs")
        .select("id,title,year,primary_photo_url")
        .eq("artist_id", artistData.id)
        .order("year", { ascending: true });

      setDesigns(designsData || []);
    }

    load();
  }, [slug]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return designs;

    return designs.filter((d) => {
      const text = `${d.year} ${d.title}`.toLowerCase();
      return text.includes(q);
    });
  }, [designs, query]);

  if (!artist) return <p style={{ color: "#666" }}>Loading…</p>;

  return (
    <main>
      <h1 style={{ marginBottom: 6 }}>{artist.name}</h1>

      {(artist.origin_country || artist.primary_genre) && (
        <div style={{ color: "#666", marginBottom: 12 }}>
          {[artist.origin_country, artist.primary_genre]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      {artist.photo_url && (
        <img
          src={artist.photo_url}
          alt={`${artist.name} photo`}
          style={{
            display: "block",
            width: "100%",
            maxWidth: 520,
            height: "auto",
            marginTop: 12,
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #e0e0e0",
            background: "#f2f2f2",
          }}
        />
      )}

      <input
        placeholder="Search designs…"
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

      <h2>Designs</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        {filtered.map((design) => (
          <a
            key={design.id}
            href={`/designs/${design.id}`}
            style={{ textDecoration: "none" }}
          >
            <div className="design-card">
              {design.primary_photo_url ? (
                <img
                  src={design.primary_photo_url}
                  alt={`${design.year} – ${design.title}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 6,
                    marginBottom: 10,
                    background: "#f2f2f2",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 6,
                    marginBottom: 10,
                    background: "#f2f2f2",
                    display: "grid",
                    placeItems: "center",
                    color: "#777",
                    fontSize: 12,
                  }}
                >
                  No photo
                </div>
              )}

              <strong>{design.year}</strong>
              <div>{design.title}</div>
            </div>
          </a>
        ))}
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}