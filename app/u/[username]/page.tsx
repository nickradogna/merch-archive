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

type TopBand = { name: string; count: number };

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = React.use(params);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [ownedCount, setOwnedCount] = useState<number | null>(null);
  const [topBand, setTopBand] = useState<TopBand | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [view, setView] = useState<"list" | "grid">("grid");

  const [ownershipPhotoMap, setOwnershipPhotoMap] = useState<Record<string, string>>(
    {}
  );
  const [variantPhotoMap, setVariantPhotoMap] = useState<Record<string, string>>(
    {}
  );

  const [message, setMessage] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    if (!viewerId || !profile) return false;
    return viewerId === profile.user_id;
  }, [viewerId, profile]);

  function unwrapVariant(row: any) {
    const v = Array.isArray(row?.variants) ? row.variants[0] : row?.variants;
    const d = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
    const a = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;
    return { v, d, a };
  }

  function designHref(designId?: string | null) {
    return designId ? `/designs/${designId}` : "#";
  }

  function artistHref(slug?: string | null) {
    return slug ? `/artists/${slug}` : "/artists";
  }

  useEffect(() => {
    async function load() {
      setMessage(null);

      // who is viewing?
      const { data: auth } = await supabase.auth.getUser();
      const viewer = auth.user?.id ?? null;
      setViewerId(viewer);

      // profile by username
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("user_id,username,bio,avatar_url,link_url,is_collection_public")
        .eq("username", username)
        .single();

      if (profileErr || !profileData) {
        setProfile(null);
        setItems([]);
        setOwnedCount(null);
        setTopBand(null);
        setOwnershipPhotoMap({});
        setVariantPhotoMap({});
        setMessage("Profile not found.");
        return;
      }

      setProfile(profileData as ProfileRow);

      // stats: total owned count
      const { count: owned } = await supabase
        .from("ownership")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileData.user_id);

      setOwnedCount(owned ?? 0);

      // can we show collection?
      const canSee =
        profileData.is_collection_public || viewer === profileData.user_id;

      if (!canSee) {
        setItems([]);
        setTopBand(null);
        setOwnershipPhotoMap({});
        setVariantPhotoMap({});
        return;
      }

      // load ownership items (keep it small + useful)
      const { data: ownedRows, error: ownedErr } = await supabase
        .from("ownership")
        .select(
          `
          id, size, memory, created_at,
          variants (
            id, base_color, garment_type, manufacturer,
            designs (
              id, year, title, primary_photo_url,
              artists ( id, name, slug )
            )
          )
        `
        )
        .eq("user_id", profileData.user_id)
        .order("created_at", { ascending: false })
        .limit(60);

      if (ownedErr) {
        setItems([]);
        setTopBand(null);
        setOwnershipPhotoMap({});
        setVariantPhotoMap({});
        setMessage(`Error loading collection: ${ownedErr.message}`);
        return;
      }

      const rows = ownedRows || [];
      setItems(rows);

      // -------- photo priority maps (ownership > variant > design) --------
      try {
        // 1) Ownership photos (user-uploaded item photos)
        const ownershipIds = rows.map((r: any) => r.id).filter(Boolean);

        if (ownershipIds.length) {
          const { data: op, error: opErr } = await supabase
            .from("ownership_photos")
            .select("id, ownership_id, url, created_at")
            .in("ownership_id", ownershipIds)
            .order("created_at", { ascending: true });

          if (!opErr) {
            const map: Record<string, string> = {};
            (op || []).forEach((p: any) => {
              if (!map[p.ownership_id] && p.url) map[p.ownership_id] = p.url;
            });
            setOwnershipPhotoMap(map);
          } else {
            setOwnershipPhotoMap({});
          }
        } else {
          setOwnershipPhotoMap({});
        }

        // 2) Variant photos via variant_photos table (optional; may not exist)
        const variantIds = rows
          .map((r: any) => {
            const v = Array.isArray(r?.variants) ? r.variants[0] : r?.variants;
            return v?.id;
          })
          .filter(Boolean);

        const vMap: Record<string, string> = {};

        if (variantIds.length) {
          const { data: vp, error: vpErr } = await supabase
            .from("variant_photos")
            .select("id, variant_id, url, created_at")
            .in("variant_id", variantIds)
            .order("created_at", { ascending: true });

          // If table doesn't exist, vpErr will be set. We just skip.
          if (!vpErr) {
            (vp || []).forEach((p: any) => {
              if (!vMap[p.variant_id] && p.url) vMap[p.variant_id] = p.url;
            });
          }
        }

        setVariantPhotoMap(vMap);
      } catch {
        setOwnershipPhotoMap({});
        setVariantPhotoMap({});
      }

      // compute top band locally from rows (robust to object-or-array joins)
      const counts: Record<string, number> = {};
      for (const r of rows) {
        const { a } = unwrapVariant(r);
        const name: string | undefined = a?.name;
        if (!name) continue;
        counts[name] = (counts[name] || 0) + 1;
      }

      let best: TopBand | null = null;
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
          <div className="stat-number">{topBand ? topBand.count : "—"}</div>
          <div className="stat-label">
            Top band{topBand ? `: ${topBand.name}` : ""}
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>Collection</h2>

      <div className="view-toggle">
        <button
          className={view === "grid" ? "active" : ""}
          onClick={() => setView("grid")}
        >
          Grid
        </button>
        <button
          className={view === "list" ? "active" : ""}
          onClick={() => setView("list")}
        >
          List
        </button>
      </div>

      {!canSeeCollection ? (
        <p style={{ color: "#666" }}>This collection is private.</p>
      ) : items.length ? (
        view === "grid" ? (
          <div className="collection-grid">
            {items.map((row) => {
              const { v, d, a } = unwrapVariant(row);

              const ownershipImg = ownershipPhotoMap[row.id];
              const variantImg = v?.id ? variantPhotoMap[v.id] : undefined;
              const img = ownershipImg || variantImg || d?.primary_photo_url;

              const href = designHref(d?.id);

              return (
                <a
                  key={row.id}
                  href={href}
                  className="collection-tile"
                  style={{ display: "block", cursor: href === "#" ? "default" : "pointer" }}
                  title={d?.title ? `View: ${d.title}` : "View design"}
                >
                  {img ? (
                    <img src={img} alt={d?.title || "Design"} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: "#777",
                      }}
                    >
                      No photo
                    </div>
                  )}

                  <div className="collection-overlay">
                    <strong>{a?.name || "Unknown artist"}</strong>
                    <div>
                      {d?.year} – {d?.title}
                    </div>
                    <div>
                      {v?.base_color} {v?.garment_type}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <ul style={{ lineHeight: 1.7 }}>
            {items.map((row) => {
              const { v, d, a } = unwrapVariant(row);

              const aHref = artistHref(a?.slug);
              const dHref = designHref(d?.id);

              return (
                <li key={row.id} style={{ marginBottom: 12 }}>
                  <a href={aHref} style={{ color: "inherit" }}>
                    <strong>{a?.name || "Unknown artist"}</strong>
                  </a>{" "}
                  —{" "}
                  <a href={dHref} style={{ color: "inherit" }}>
                    {d?.year} – {d?.title}
                  </a>
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
        )
      ) : (
        <p style={{ color: "#666" }}>
          {isOwner ? "Your collection is empty." : "No items yet."}
        </p>
      )}

      {message && <p style={{ color: "#666", marginTop: 14 }}>{message}</p>}
    </main>
  );
}