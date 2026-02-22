"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
  is_collection_public: boolean | null;
};

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = React.use(params);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [ownershipPhotos, setOwnershipPhotos] = useState<Record<string, any[]>>(
    {}
  );
  const [message, setMessage] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      setMessage(null);

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("user_id,username,bio,avatar_url,link_url,is_collection_public")
        .eq("username", username)
        .maybeSingle();

      if (pErr) {
        setMessage(pErr.message);
        return;
      }

      if (!p) {
        setMessage("User not found.");
        return;
      }

      setProfile(p);

      if (!p.is_collection_public) {
        setItems([]);
        return;
      }

      const { data: owned, error: oErr } = await supabase
        .from("ownership")
        .select(
          `
          id,
          size,
          memory,
          setlist_url,
          created_at,
          variants (
            id,
            base_color,
            garment_type,
            manufacturer,
            designs (
              id,
              title,
              year,
              primary_photo_url,
              artists (
                id,
                name,
                slug,
                photo_url
              )
            )
          )
        `
        )
        .eq("user_id", p.user_id)
        .order("created_at", { ascending: false });

      if (oErr) {
        setMessage(oErr.message);
        return;
      }

      const rows = owned || [];
      setItems(rows);

      // load ownership photos (if you have that table)
      const ownershipIds = rows.map((r: any) => r.id);
      if (ownershipIds.length > 0) {
        const { data: photos } = await supabase
          .from("ownership_photos")
          .select("id, ownership_id, url, label")
          .in("ownership_id", ownershipIds)
          .order("created_at", { ascending: true });

        const map: Record<string, any[]> = {};
        (photos || []).forEach((p: any) => {
          if (!map[p.ownership_id]) map[p.ownership_id] = [];
          map[p.ownership_id].push(p);
        });
        setOwnershipPhotos(map);
      }
    }

    load();
  }, [username]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((row) => {
      const text =
        `${row.variants.designs.artists.name} ${row.variants.designs.title} ` +
        `${row.variants.base_color} ${row.variants.garment_type} ${row.variants.manufacturer} ` +
        `${row.size || ""} ${row.memory || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [items, query]);

  return (
    <main style={{ maxWidth: 960 }}>
      {profile ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`${profile.username} avatar`}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 16,
                  objectFit: "cover",
                  border: "1px solid #e0e0e0",
                  background: "#f2f2f2",
                }}
              />
            ) : (
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 16,
                  border: "1px solid #e0e0e0",
                  background: "#f2f2f2",
                }}
              />
            )}

            <div>
              <h1 style={{ margin: 0 }}>{profile.username}</h1>
              {profile.bio && (
                <p style={{ marginTop: 6, marginBottom: 0, color: "#555" }}>
                  {profile.bio}
                </p>
              )}
              {profile.link_url && (
                <p style={{ marginTop: 6, marginBottom: 0 }}>
                  <a href={profile.link_url} target="_blank" rel="noreferrer">
                    {profile.link_url}
                  </a>
                </p>
              )}
            </div>
          </div>

          {profile.is_collection_public ? (
            <>
              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <input
                  placeholder="Search this collection…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              {visibleItems.length === 0 ? (
                <p style={{ color: "#666" }}>No items found.</p>
              ) : (
                <ul style={{ paddingLeft: 18 }}>
                  {visibleItems.map((row) => (
                    <li key={row.id} style={{ marginBottom: 14 }}>
                      <strong>{row.variants.designs.artists.name}</strong> —{" "}
                      {row.variants.designs.year} – {row.variants.designs.title}
                      <br />
                      {row.variants.base_color} {row.variants.garment_type} —{" "}
                      {row.variants.manufacturer}
                      <br />
                      Size: <strong>{row.size}</strong>
                      {row.setlist_url && (
                        <>
                          <br />
                          Show:{" "}
                          <a
                            href={row.setlist_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            setlist.fm
                          </a>
                        </>
                      )}
                      {row.memory && (
                        <>
                          <br />
                          <em>“{row.memory}”</em>
                        </>
                      )}

                      {(ownershipPhotos[row.id] || []).length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(140px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {(ownershipPhotos[row.id] || []).map((p: any) => (
                            <figure key={p.id} style={{ margin: 0 }}>
                              <img
                                src={p.url}
                                alt={p.label || "Ownership photo"}
                                style={{
                                  width: "100%",
                                  aspectRatio: "1 / 1",
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid #e0e0e0",
                                  background: "#f2f2f2",
                                }}
                              />
                              {p.label && (
                                <figcaption
                                  style={{
                                    fontSize: 12,
                                    color: "#666",
                                    marginTop: 4,
                                  }}
                                >
                                  {p.label}
                                </figcaption>
                              )}
                            </figure>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p style={{ color: "#666" }}>
              This user’s collection is private.
            </p>
          )}
        </>
      ) : (
        <p style={{ color: "#666" }}>Loading…</p>
      )}

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}