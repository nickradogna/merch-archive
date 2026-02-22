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
  const [status, setStatus] = useState<Status>("loading");

  const [counts, setCounts] = useState({
    artists24h: 0,
    designs24h: 0,
    variants24h: 0,
    artists7d: 0,
    designs7d: 0,
    variants7d: 0,
  });

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [usernamesById, setUsernamesById] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    async function checkAdmin() {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

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

  useEffect(() => {
    if (status !== "ok") return;

    async function load() {
      // ---- overview counts ----
      const since24h = isoDaysAgo(1);
      const since7d = isoDaysAgo(7);

      const [
        a24,
        d24,
        v24,
        a7,
        d7,
        v7,
      ] = await Promise.all([
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

      // ---- recent rows for timeline (pull a bit from each, then combine) ----
      const [artistsRes, designsRes, variantsRes] = await Promise.all([
        supabase
          .from("artists")
          .select("id,name,slug,created_at,created_by")
          .order("created_at", { ascending: false })
          .limit(25),

        supabase
          .from("designs")
          .select("id,title,year,created_at,created_by, artists(name,slug)")
          .order("created_at", { ascending: false })
          .limit(25),

        supabase
          .from("variants")
          .select(
            "id,base_color,garment_type,manufacturer,created_at,created_by, designs(id,title,year, artists(name,slug))"
          )
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      const t: TimelineItem[] = [];

      (artistsRes.data || []).forEach((a: any) => {
        t.push({
          type: "artist",
          created_at: a.created_at,
          created_by: a.created_by,
          title: a.name,
          subtitle: a.slug ? `/${a.slug}` : undefined,
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
          subtitle: `${v.base_color} ${v.garment_type} — ${v.manufacturer}`,
          href: design?.id ? `/designs/${design.id}` : "/artists",
        });
      });

      t.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const sliced = t.slice(0, 40);
      setTimeline(sliced);

      // ---- map created_by -> username for display ----
      const ids = Array.from(new Set(sliced.map((x) => x.created_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,username")
          .in("user_id", ids);

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

  const header = useMemo(() => {
    if (status === "loading") return { title: "Admin", body: "Checking access…" };
    if (status === "not_signed_in") return { title: "Admin", body: "Please sign in to access admin tools." };
    if (status === "not_admin") return { title: "Admin", body: "You don’t have permission to access this page." };
    return { title: "Admin", body: "Calm status overview." };
  }, [status]);

  if (status !== "ok") {
    return (
      <main>
        <h1>{header.title}</h1>
        <p style={{ color: "#666" }}>{header.body}</p>
        {status === "not_signed_in" ? (
          <a className="button-primary" href="/login">Go to login</a>
        ) : (
          <a className="button-primary" href="/">Go home</a>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>Admin</h1>
      <p style={{ color: "#666", marginTop: 6 }}>
        Calm status overview + recent activity.
      </p>

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
          <div style={{ color: "#777", marginTop: 6, fontSize: 12 }}>
            {counts.artists7d} this week
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{counts.designs24h}</div>
          <div className="stat-label">New designs (24h)</div>
          <div style={{ color: "#777", marginTop: 6, fontSize: 12 }}>
            {counts.designs7d} this week
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{counts.variants24h}</div>
          <div className="stat-label">New variants (24h)</div>
          <div style={{ color: "#777", marginTop: 6, fontSize: 12 }}>
            {counts.variants7d} this week
          </div>
        </div>
      </div>

      {/* Timeline */}
      <h2 style={{ marginTop: 24 }}>Recent activity</h2>

      {!timeline.length ? (
        <p style={{ color: "#666" }}>No recent activity.</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          {timeline.map((item, idx) => {
            const who =
              item.created_by && usernamesById[item.created_by]
                ? usernamesById[item.created_by]
                : null;

            const badge =
              item.type === "artist"
                ? "Artist"
                : item.type === "design"
                ? "Design"
                : "Variant";

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
                    <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                      {item.subtitle}
                    </div>
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
    </main>
  );
}