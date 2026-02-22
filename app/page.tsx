"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RecentRow = {
  id: string;
  user_id: string;
  created_at: string;
  size: string | null;
  variants: any;
};

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

  const [recent, setRecent] = useState<
    Array<{
      ownership_id: string;
      created_at: string;
      username: string;
      avatar_url: string | null;
      artist_name: string;
      year: number | null;
      title: string;
      design_id: string;
      base_color: string | null;
      garment_type: string | null;
      image_url: string | null;
    }>
  >([]);

    const [topArtists, setTopArtists] = useState<
    Array<{ artist_id: string; artist_name: string; artist_slug: string; owned_count: number }>
  >([]);

  useEffect(() => {
    async function load() {
      // ---------- stats ----------
      const [{ count: artists }, { count: designs }, { count: variants }] =
        await Promise.all([
          supabase.from("artists").select("id", { count: "exact", head: true }),
          supabase.from("designs").select("id", { count: "exact", head: true }),
          supabase.from("variants").select("id", { count: "exact", head: true }),
        ]);

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

      // ---------- recently added by community ----------
      // Pull more than we need, then filter down to public profiles.
      const { data: ownedRows, error: ownedErr } = await supabase
        .from("ownership")
        .select(
          `
          id, user_id, created_at, size,
          variants (
            id, base_color, garment_type,
            designs (
              id, year, title, primary_photo_url,
              artists ( id, name, slug )
            )
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(40);

      if (ownedErr || !ownedRows) {
        setRecent([]);
        return;
      }

      const rows = ownedRows as RecentRow[];

      // profiles for these user_ids (and only public)
      const userIds = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean);

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, is_collection_public")
        .in("user_id", userIds);

      if (profErr || !profiles) {
        setRecent([]);
        return;
      }

      const publicProfiles = new Map<
        string,
        { username: string; avatar_url: string | null }
      >();

      (profiles as any[]).forEach((p) => {
        if (p.is_collection_public && p.username) {
          publicProfiles.set(p.user_id, {
            username: p.username,
            avatar_url: p.avatar_url || null,
          });
        }
      });

      // ownership photos (thumbnails)
const ownershipIds = rows.map((r) => r.id);
const { data: op, error: opErr } = await supabase
  .from("ownership_photos")
  .select("ownership_id, url, created_at")
  .in("ownership_id", ownershipIds)
  .order("created_at", { ascending: true });

const ownershipPhotoMap: Record<string, string> = {};
if (!opErr && op) {
  (op as any[]).forEach((p) => {
    if (!ownershipPhotoMap[p.ownership_id] && p.url) {
      ownershipPhotoMap[p.ownership_id] = p.url;
    }
  });
}

// variant photos (fallback #2) — optional table
const variantIds = Array.from(
  new Set(
    rows
      .map((r: any) => {
        const v = Array.isArray(r.variants) ? r.variants[0] : r.variants;
        return v?.id;
      })
      .filter(Boolean)
  )
);

const variantPhotoMap: Record<string, string> = {};
if (variantIds.length) {
  const { data: vp, error: vpErr } = await supabase
    .from("variant_photos")
    .select("variant_id, url, created_at")
    .in("variant_id", variantIds)
    .order("created_at", { ascending: true });

  // If the table doesn't exist, vpErr will be set — just ignore.
  if (!vpErr && vp) {
    (vp as any[]).forEach((p) => {
      if (!variantPhotoMap[p.variant_id] && p.url) {
        variantPhotoMap[p.variant_id] = p.url;
      }
    });
  }
}

      // Build feed items, filter to public profiles, limit to 12
      const feed = rows
        .filter((r) => publicProfiles.has(r.user_id))
        .map((r) => {
          const prof = publicProfiles.get(r.user_id)!;

          const v = Array.isArray(r.variants) ? r.variants[0] : r.variants;
          const d = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
          const a = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;

          const ownershipImg = ownershipPhotoMap[r.id];
const variantImg = v?.id ? variantPhotoMap[v.id] : null;
const designImg = d?.primary_photo_url || null;

return {
  ownership_id: r.id,
  created_at: r.created_at,
  username: prof.username,
  avatar_url: prof.avatar_url,
  artist_name: a?.name || "Unknown artist",
  year: d?.year ?? null,
  title: d?.title || "Untitled",
  design_id: d?.id,
  base_color: v?.base_color || null,
  garment_type: v?.garment_type || null,
  image_url: ownershipImg || variantImg || designImg,
};
        })
        .slice(0, 12);

      setRecent(feed);

            // ---------- top artists by total ownership ----------
      const { data: topData } = await supabase
        .from("artist_ownership_counts")
        .select("artist_id, artist_name, artist_slug, photo_url, origin_country, primary_genre, owned_count")
        .order("owned_count", { ascending: false })
        .limit(10);

      setTopArtists((topData as any[]) || []);
    }

    load();
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
        <a href="/add">
          <button>Add +</button>
        </a>
      </div>

      {/* Recently added */}
      <div style={{ marginTop: 34, borderTop: "1px solid #eee", paddingTop: 18 }}>
        <h2 style={{ margin: "0 0 10px 0" }}>Recently added by the community</h2>

        {recent.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 12,
            }}
          >
            {recent.map((r) => (
              <a
                key={r.ownership_id}
                href={`/designs/${r.design_id}`}
                style={{ textDecoration: "none", color: "inherit" }}
                title="View design"
              >
                <div className="design-card">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={`${r.artist_name} – ${r.title}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        borderRadius: 8,
                        marginBottom: 10,
                        background: "#f2f2f2",
                        border: "1px solid #e0e0e0",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 8,
                        marginBottom: 10,
                        background: "#f2f2f2",
                        border: "1px solid #e0e0e0",
                        display: "grid",
                        placeItems: "center",
                        color: "#777",
                        fontSize: 12,
                      }}
                    >
                      No photo
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt={`${r.username} avatar`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          objectFit: "cover",
                          border: "1px solid #e0e0e0",
                          background: "#f2f2f2",
                          flex: "0 0 auto",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid #e0e0e0",
                          background: "#f2f2f2",
                          flex: "0 0 auto",
                        }}
                      />
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Added by{" "}
                        <span
  role="link"
  tabIndex={0}
  onClick={(e) => {
    e.stopPropagation();
    window.location.href = `/u/${r.username}`;
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      window.location.href = `/u/${r.username}`;
    }
  }}
  style={{ cursor: "pointer", color: "inherit" }}
>
  <strong>{r.username}</strong>
</span>
                      </div>

                      <div style={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {r.artist_name}
                      </div>

                      <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
                        {r.year ? `${r.year} – ` : ""}
                        {r.title}
                      </div>

                      <div style={{ color: "#777", fontSize: 12, marginTop: 4 }}>
                        {[r.base_color, r.garment_type].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p style={{ color: "#666", marginTop: 10 }}>
            No public collection activity yet.
          </p>
        )}

        {/* Top artists */}
<div style={{ marginTop: 22 }}>
  <h2 style={{ margin: "0 0 10px 0" }}>Top artists by total ownership</h2>

  {topArtists.length ? (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 14,
        marginTop: 8,
      }}
    >
      {topArtists.map((a) => (
        <a
          key={a.artist_id}
          href={`/artists/${a.artist_slug}`}
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
            {a.photo_url ? (
              <img
                src={a.photo_url}
                alt={`${a.artist_name} photo`}
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

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, display: "flex", gap: 8 }}>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {a.artist_name}
                </span>

                <span style={{ color: "#777", fontSize: 12, whiteSpace: "nowrap" }}>
                  {a.owned_count}
                </span>
              </div>

              {(a.origin_country || a.primary_genre) && (
                <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                  {[a.origin_country, a.primary_genre].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  ) : (
    <p style={{ color: "#666", marginTop: 8 }}>No ownership data yet.</p>
  )}
</div>

<p style={{ marginTop: 18, color: "#777", fontSize: 13, lineHeight: 1.6 }}>
  Minimal by design. Community maintained. Built for collectors.
</p>
      </div>
    </main>
  );
}