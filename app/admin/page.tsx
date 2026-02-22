"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "not_signed_in" | "not_admin" | "ok";

type TimelineItem = {
  type: "artist" | "design" | "variant";
  created_at: string;
  title: string;
  subtitle?: string;
  href: string;
  created_by?: string | null;
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  // --- hooks MUST be declared unconditionally at the top ---
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState<string | null>(null);

  const [viewer, setViewer] = useState<{ userId: string | null; email: string | null }>({
    userId: null,
    email: null,
  });

  const [counts, setCounts] = useState({
    artists24h: 0,
    designs24h: 0,
    variants24h: 0,
    artists7d: 0,
    designs7d: 0,
    variants7d: 0,
  });

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [usernamesById, setUsernamesById] = useState<Record<string, string>>({});

  const [artists, setArtists] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  const [tab, setTab] = useState<"overview" | "artists" | "designs" | "variants">("overview");
  const [query, setQuery] = useState("");

  // --- derived values (hooks still unconditional) ---
  const q = query.trim().toLowerCase();

  const filteredArtists = useMemo(() => {
    if (!q) return artists;
    return artists.filter((a: any) => {
      const text = `${a.name} ${a.slug || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [artists, q]);

  const filteredDesigns = useMemo(() => {
    if (!q) return designs;
    return designs.filter((d: any) => {
      const artist = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;
      const text = `${artist?.name || ""} ${d.year || ""} ${d.title || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [designs, q]);

  const filteredVariants = useMemo(() => {
    if (!q) return variants;
    return variants.filter((v: any) => {
      const design = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
      const artist = Array.isArray(design?.artists) ? design.artists[0] : design?.artists;
      const text = `${artist?.name || ""} ${design?.year || ""} ${design?.title || ""} ${v.base_color || ""} ${
        v.garment_type || ""
      } ${v.manufacturer || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [variants, q]);

  // ---- Admin gate ----
  useEffect(() => {
    async function checkAdmin() {
      setMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      const email = auth.user?.email ?? null;

      setViewer({ userId, email });

      if (!userId) {
        setStatus("not_signed_in");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", userId)
        .single();

      if (error || !profile?.is_admin) {
        setStatus("not_admin");
        return;
      }

      setStatus("ok");
    }

    checkAdmin();
  }, []);

  // ---- Load data when ok ----
  useEffect(() => {
    if (status !== "ok") return;

    async function load() {
      setMsg(null);

      const since24h = isoDaysAgo(1);
      const since7d = isoDaysAgo(7);

      const [a24, d24, v24, a7, d7, v7] = await Promise.all([
        supabase.from("artists").select("id", { count: "exact", head: true }).gte("created_at", since24h),
        supabase.from("designs").select("id", { count: "exact", head: true }).gte("created_at", since24h),
        supabase.from("variants").select("id", { count: "exact", head: true }).gte("created_at", since24h),
        supabase.from("artists").select("id", { count: "exact", head: true }).gte("created_at", since7d),
        supabase.from("designs").select("id", { count: "exact", head: true }).gte("created_at", since7d),
        supabase.from("variants").select("id", { count: "exact", head: true }).gte("created_at", since7d),
      ]);

      setCounts({
        artists24h: a24.count ?? 0,
        designs24h: d24.count ?? 0,
        variants24h: v24.count ?? 0,
        artists7d: a7.count ?? 0,
        designs7d: d7.count ?? 0,
        variants7d: v7.count ?? 0,
      });

      const [artistsRes, designsRes, variantsRes] = await Promise.all([
        supabase
          .from("artists")
          .select("id,name,slug,is_hidden,created_at,created_by")
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("designs")
          .select("id,title,year,is_hidden,created_at,created_by, artists(name,slug)")
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("variants")
          .select(
            "id,base_color,garment_type,manufacturer,is_hidden,created_at,created_by, designs(id,title,year, artists(name,slug))"
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setArtists(artistsRes.data || []);
      setDesigns(designsRes.data || []);
      setVariants(variantsRes.data || []);

      const t: TimelineItem[] = [];

      (artistsRes.data || []).forEach((a: any) => {
        t.push({
          type: "artist",
          created_at: a.created_at,
          created_by: a.created_by,
          title: a.name,
          subtitle: a.slug ? `/${a.slug}${a.is_hidden ? " • hidden" : ""}` : a.is_hidden ? "hidden" : undefined,
          href: a.slug ? `/artists/${a.slug}` : "/artists",
        });
      });

      (designsRes.data || []).forEach((d: any) => {
        const artist = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;
        const artistName = artist?.name ? String(artist.name) : "Unknown artist";
        const year = d.year ? String(d.year) : "—";
        t.push({
          type: "design",
          created_at: d.created_at,
          created_by: d.created_by,
          title: `${artistName} — ${year} – ${d.title}`,
          subtitle: d.is_hidden ? "hidden" : undefined,
          href: `/designs/${d.id}`,
        });
      });

      (variantsRes.data || []).forEach((v: any) => {
        const design = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
        const artist = Array.isArray(design?.artists) ? design.artists[0] : design?.artists;
        const artistName = artist?.name ? String(artist.name) : "Unknown artist";
        const year = design?.year ? String(design.year) : "—";
        const designTitle = design?.title ? String(design.title) : "Unknown design";

        t.push({
          type: "variant",
          created_at: v.created_at,
          created_by: v.created_by,
          title: `${artistName} — ${year} – ${designTitle}`,
          subtitle: `${v.base_color} ${v.garment_type} — ${v.manufacturer}${v.is_hidden ? " • hidden" : ""}`,
          href: design?.id ? `/designs/${design.id}` : "/artists",
        });
      });

      t.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const sliced = t.slice(0, 40);
      setTimeline(sliced);

      const ids = Array.from(new Set(sliced.map((x) => x.created_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id,username").in("user_id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          if (p.user_id && p.username) map[p.user_id] = p.username;
        });
        setUsernamesById(map);
      } else {
        setUsernamesById({});
      }
    }

    load();
  }, [status]);

  // ---- Hide/unhide via RPC (bypasses table RLS safely) ----
  async function toggleHidden(table: "artists" | "designs" | "variants", id: string, nextHidden: boolean) {
    setMsg(null);

    const { error } = await supabase.rpc("admin_set_hidden", {
      target_table: table,
      row_id: id,
      hide: nextHidden,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    const updater = (rows: any[]) => rows.map((r) => (r.id === id ? { ...r, is_hidden: nextHidden } : r));
    if (table === "artists") setArtists((s) => updater(s));
    if (table === "designs") setDesigns((s) => updater(s));
    if (table === "variants") setVariants((s) => updater(s));
  }

  // ---- Render ----
  if (status !== "ok") {
    return (
      <main>
        <h1>Admin</h1>
        <p style={{ color: "#666" }}>
          {status === "loading"
            ? "Checking access…"
            : status === "not_signed_in"
            ? "Please sign in to access admin tools."
            : "You don’t have permission to access this page."}
        </p>

        <div style={{ marginTop: 12, fontSize: 12, color: "#777" }}>
          <div>userId: {viewer.userId ?? "null"}</div>
          <div>email: {viewer.email ?? "null"}</div>
        </div>

        {status === "not_signed_in" ? (
          <a className="button-primary" href="/login">
            Go to login
          </a>
        ) : (
          <a className="button-primary" href="/">
            Go home
          </a>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>Admin</h1>
      <p style={{ color: "#666", marginTop: 6 }}>Calm status overview + recent activity + hide tools.</p>

      {/* Debug */}
      <div
        style={{
          marginTop: 10,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #eee",
          background: "#fff",
          fontSize: 12,
          color: "#777",
          maxWidth: 720,
        }}
      >
        <div>userId: {viewer.userId ?? "null"}</div>
        <div>email: {viewer.email ?? "null"}</div>
      </div>

      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ffd7d7",
            background: "#fff5f5",
          }}
        >
          <div style={{ color: "#b00020", fontWeight: 700, marginBottom: 4 }}>Error</div>
          <div style={{ color: "#b00020" }}>{msg}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={tab === "overview" ? "button-primary" : ""} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button className={tab === "artists" ? "button-primary" : ""} onClick={() => setTab("artists")}>
          Artists
        </button>
        <button className={tab === "designs" ? "button-primary" : ""} onClick={() => setTab("designs")}>
          Designs
        </button>
        <button className={tab === "variants" ? "button-primary" : ""} onClick={() => setTab("variants")}>
          Variants
        </button>
      </div>

      {tab !== "overview" && (
        <div style={{ marginTop: 16, maxWidth: 720 }}>
          <input
            placeholder={`Search ${tab}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
            }}
          />
        </div>
      )}

      {tab === "overview" && (
        <>
          {/* Overview cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginTop: 16,
              maxWidth: 920,
            }}
          >
            <div className="stat-card">
              <div className="stat-number">{counts.artists24h}</div>
              <div className="stat-label">New artists (24h)</div>
              <div style={{ color: "#777", marginTop: 6, fontSize: 12 }}>{counts.artists7d} this week</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{counts.designs24h}</div>
              <div className="stat-label">New designs (24h)</div>
              <div style={{ color: "#777", marginTop: 6, fontSize: 12 }}>{counts.designs7d} this week</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{counts.variants24h}</div>
              <div className="stat-label">New variants (24h)</div>
              <div style={{ color: "#777", marginTop: 6, fontSize: 12 }}>{counts.variants7d} this week</div>
            </div>
          </div>

          <h2 style={{ marginTop: 24 }}>Recent activity</h2>

          {!timeline.length ? (
            <p style={{ color: "#666" }}>No recent activity.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {timeline.map((item, idx) => {
                const who =
                  item.created_by && usernamesById[item.created_by] ? usernamesById[item.created_by] : null;

                const badge = item.type === "artist" ? "Artist" : item.type === "design" ? "Design" : "Variant";

                return (
                  <div
                    key={`${item.type}-${idx}-${item.created_at}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      border: "1px solid #eee",
                      borderRadius: 12,
                      background: "#fff",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #e8e8e8",
                        background: "#fafafa",
                        flex: "0 0 auto",
                      }}
                    >
                      {badge}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>
                        <a href={item.href} style={{ color: "inherit" }}>
                          {item.title}
                        </a>
                      </div>

                      {item.subtitle && (
                        <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{item.subtitle}</div>
                      )}

                      <div style={{ color: "#777", fontSize: 12, marginTop: 6 }}>
                        {formatWhen(item.created_at)}
                        {who ? ` • by ${who}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "artists" && (
        <div style={{ marginTop: 14 }}>
          {!filteredArtists.length ? (
            <p style={{ color: "#666" }}>No artists found.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredArtists.map((a: any) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 12px",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>
                      <a href={a.slug ? `/artists/${a.slug}` : "/artists"} style={{ color: "inherit" }}>
                        {a.name}
                      </a>
                    </div>
                    <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                      {a.slug ? `/${a.slug}` : "—"} {a.is_hidden ? " • hidden" : ""}
                    </div>
                  </div>

                  <button onClick={() => toggleHidden("artists", a.id, !a.is_hidden)}>
                    {a.is_hidden ? "Unhide" : "Hide"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "designs" && (
        <div style={{ marginTop: 14 }}>
          {!filteredDesigns.length ? (
            <p style={{ color: "#666" }}>No designs found.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredDesigns.map((d: any) => {
                const artist = Array.isArray(d?.artists) ? d.artists[0] : d?.artists;
                const artistName = artist?.name ? String(artist.name) : "Unknown artist";
                const year = d.year ? String(d.year) : "—";
                return (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "10px 12px",
                      border: "1px solid #eee",
                      borderRadius: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>
                        <a href={`/designs/${d.id}`} style={{ color: "inherit" }}>
                          {artistName} — {year} – {d.title}
                        </a>
                      </div>
                      <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                        {d.is_hidden ? "hidden" : "visible"}
                      </div>
                    </div>

                    <button onClick={() => toggleHidden("designs", d.id, !d.is_hidden)}>
                      {d.is_hidden ? "Unhide" : "Hide"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "variants" && (
        <div style={{ marginTop: 14 }}>
          {!filteredVariants.length ? (
            <p style={{ color: "#666" }}>No variants found.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredVariants.map((v: any) => {
                const design = Array.isArray(v?.designs) ? v.designs[0] : v?.designs;
                const artist = Array.isArray(design?.artists) ? design.artists[0] : design?.artists;
                const artistName = artist?.name ? String(artist.name) : "Unknown artist";
                const year = design?.year ? String(design.year) : "—";
                const designTitle = design?.title ? String(design.title) : "Unknown design";

                return (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "10px 12px",
                      border: "1px solid #eee",
                      borderRadius: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>
                        <a href={design?.id ? `/designs/${design.id}` : "/artists"} style={{ color: "inherit" }}>
                          {artistName} — {year} – {designTitle}
                        </a>
                      </div>
                      <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                        {v.base_color} {v.garment_type} — {v.manufacturer} {v.is_hidden ? " • hidden" : ""}
                      </div>
                    </div>

                    <button onClick={() => toggleHidden("variants", v.id, !v.is_hidden)}>
                      {v.is_hidden ? "Unhide" : "Hide"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}