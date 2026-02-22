"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
  is_collection_public: boolean;
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = React.use(params);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ownedCount, setOwnedCount] = useState<number | null>(null);
  const [topBand, setTopBand] = useState<{ name: string; count: number } | null>(
    null
  );

  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    if (!viewerId || !profile) return false;
    return viewerId === profile.user_id;
  }, [viewerId, profile]);

  useEffect(() => {
    async function load() {
      setMessage(null);

      // who is viewing?
      const { data: auth } = await supabase.auth.getUser();
      setViewerId(auth.user?.id ?? null);

      // profile by username
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id,username,bio,avatar_url,link_url,is_collection_public")
        .eq("username", username)
        .single();

      if (profileErr || !profileData) {
        setProfile(null);
        setMessage("Profile not found.");
        return;
      }

      setProfile(profileData as ProfileRow);

      // stats: total owned count
      const { count } = await supabase
        .from("ownership")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileData.user_id);

      setOwnedCount(count ?? 0);

      // if not owner + collection is private, stop here
      const canSeeCollection =
        profileData.is_collection_public || auth.user?.id === profileData.user_id;

      if (!canSeeCollection) {
        setItems([]);
        setTopBand(null);
        return;
      }

      // load ownership items (keep it small + useful)
      const { data: ownedRows } = await supabase
        .from("ownership")
        .select(
          `
          id, size, memory, created_at,
          variants (
            id, base_color, garment_type, manufacturer,
            designs (
              id, year, title,
              artists ( id, name, slug )
            )
          )
        `
        )
        .eq("user_id", profileData.user_id)
        .order("created_at", { ascending: false })
        .limit(60);

      const rows = ownedRows || [];
      setItems(rows);

      // compute top band locally from the rows we fetched (handle object-or-array joins)
const counts: Record<string, number> = {};

for (const r of rows) {
  const v = Array.isArray(r?.variants) ? r.variants[0] : r?.variants;
  const d = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
  const a = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;

  const name: string | undefined = a?.name;

  if (!name) continue;
  counts[name] = (counts[name] || 0) + 1;
}

let best: { name: string; count: number } | null = null;
for (const [name, c] of Object.entries(counts)) {
  if (!best || c > best.count) best = { name, count: c };
}

setTopBand(best);
    }

    load();
  }, [username]);

  if (message && !profile) {
    return (
      <main>
        <h1>Collector</h1>
        <p style={{ color: "#666" }}>{message}</p>
      </main>
    );
  }

  if (!profile) return <p style={{ color: "#666" }}>Loading…</p>;
  function unwrapVariant(row: any) {
  const v = Array.isArray(row?.variants) ? row.variants[0] : row?.variants;
  const d = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
  const a = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;
  return { v, d, a };
}

  const canSeeCollection = profile.is_collection_public || isOwner;

  return (
    <main>
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`${profile.username} avatar`}
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              objectFit: "cover",
              border: "1px solid #e0e0e0",
              background: "#f2f2f2",
              flex: "0 0 auto",
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              border: "1px solid #e0e0e0",
              background: "#f2f2f2",
              display: "grid",
              placeItems: "center",
              color: "#777",
              flex: "0 0 auto",
            }}
          >
            —
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{profile.username}</h1>
          {profile.bio && (
            <p style={{ margin: "6px 0 0 0", color: "#666" }}>{profile.bio}</p>
          )}
          {profile.link_url && (
            <p style={{ margin: "6px 0 0 0" }}>
              <a href={profile.link_url} target="_blank" rel="noreferrer">
                {profile.link_url}
              </a>
            </p>
          )}
        </div>

        {isOwner && (
          <div style={{ marginLeft: "auto" }}>
            <a className="button-primary" href="/profile/edit">
              Edit profile
            </a>
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 18,
          maxWidth: 720,
        }}
      >
        <div className="stat-card">
          <div className="stat-number">{ownedCount ?? "—"}</div>
          <div className="stat-label">Items owned</div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {topBand ? topBand.count : "—"}
          </div>
          <div className="stat-label">
            Top band{topBand ? `: ${topBand.name}` : ""}
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>Collection</h2>

      {!canSeeCollection ? (
        <p style={{ color: "#666" }}>This collection is private.</p>
      ) : items.length ? (
        <ul style={{ lineHeight: 1.7 }}>
          {items.map((row) => {
  const { v, d, a } = unwrapVariant(row);

  return (
    <li key={row.id} style={{ marginBottom: 12 }}>
      <strong>{a?.name || "Unknown artist"}</strong> — {d?.year} – {d?.title}
      <br />
      {v?.base_color} {v?.garment_type} — {v?.manufacturer}
      <br />
      Size: <strong>{row.size}</strong>

      {row.memory && (
        <>
          <br />
          <em>“{row.memory}”</em>
        </>
      )}
    </li>
  );
})}
        </ul>
      ) : (
        <p style={{ color: "#666" }}>
          {isOwner ? "Your collection is empty." : "No items yet."}
        </p>
      )}
    </main>
  );
}