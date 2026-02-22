"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CollectionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ownershipPhotos, setOwnershipPhotos] = useState<Record<string, any[]>>({});
  const [sortMode, setSortMode] = useState<"recent" | "artist" | "year">("recent");
  const [query, setQuery] = useState("");
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [groupByArtist, setGroupByArtist] = useState(false);

  useEffect(() => {
    async function load() {
      setMessage(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (!userId) {
        setMessage("Please sign in to view your collection.");
        return;
      }

      const { data, error } = await supabase
  .from("ownership")
  .select(`
    id,
    size,
    memory,
    setlist_url,
    created_at,
    variants:variant_id (
      id,
      base_color,
      garment_type,
      manufacturer,
      designs:design_id (
        id,
        title,
        year,
        artists:artist_id (
          id,
          name
        )
      )
    )
  `)
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        return;
      }

      setItems(data || []);

      const ownershipIds = (data || []).map((r: any) => r.id);

if (ownershipIds.length) {
  const { data: photoRows } = await supabase
    .from("ownership_photos")
    .select("*")
    .in("ownership_id", ownershipIds)
    .order("created_at", { ascending: true });

  const grouped: Record<string, any[]> = {};
  (photoRows || []).forEach((p: any) => {
    grouped[p.ownership_id] = grouped[p.ownership_id] || [];
    grouped[p.ownership_id].push(p);
  });

  setOwnershipPhotos(grouped);
} else {
  setOwnershipPhotos({});
}
    }

    load();
  }, []);
  async function uploadOwnershipPhoto(ownershipId: string, file: File, label?: string) {
  setMessage(null);

  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `ownership-${ownershipId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("ownership-photos")
    .upload(fileName, file);

  if (uploadError) {
    setMessage(uploadError.message);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("ownership-photos")
    .getPublicUrl(fileName);

  const url = publicUrlData.publicUrl;

  const { error: insertError } = await supabase.from("ownership_photos").insert({
    ownership_id: ownershipId,
    url,
    label: label?.trim() || null,
  });

  if (insertError) {
    setMessage(insertError.message);
    return;
  }

  setOwnershipPhotos((prev) => {
    const next = { ...prev };
    const arr = next[ownershipId] ? [...next[ownershipId]] : [];
    arr.push({ id: crypto.randomUUID(), ownership_id: ownershipId, url, label });
    next[ownershipId] = arr;
    return next;
  });

  setMessage("Photo uploaded.");
}

const sortedItems = [...items].sort((a, b) => {
  if (sortMode === "recent") {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }

  if (sortMode === "artist") {
    const an = a.variants.designs.artists.name.toLowerCase();
    const bn = b.variants.designs.artists.name.toLowerCase();
    return an.localeCompare(bn);
  }

  // year: new -> old
  return (b.variants.designs.year || 0) - (a.variants.designs.year || 0);
});

const visibleItems = sortedItems
  .filter((row) => {
    const text = `${row.variants.designs.artists.name} ${row.variants.designs.title} ${row.variants.base_color} ${row.variants.manufacturer}`.toLowerCase();
    return text.includes(query.toLowerCase());
  })
  .filter((row) =>
    onlyWithPhotos ? (ownershipPhotos[row.id] || []).length > 0 : true
  );

  const groupedByArtist = Array.from(
  visibleItems.reduce((map: Map<string, any[]>, row: any) => {
    const name = row.variants.designs.artists.name as string;
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(row);
    return map;
  }, new Map<string, any[]>())
);

const totalOwned = items.length;

const withPhotos = items.filter(
  (row) => (ownershipPhotos[row.id] || []).length > 0
).length;

const uniqueArtists = new Set(
  items.map((row) => row.variants.designs.artists.name)
).size;


  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Collection</h1>

      <div style={{ marginTop: 8, marginBottom: 16, color: "#666", fontSize: 13 }}>
  {totalOwned} items · {withPhotos} with photos · {uniqueArtists} artists
</div>
    
    <div style={{ marginTop: 12, marginBottom: 16 }}>
  <label style={{ color: "#666", fontSize: 13 }}>
    Sort{" "}
    <select
      value={sortMode}
      onChange={(e) => setSortMode(e.target.value as any)}
      style={{ marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
    >
      <option value="recent">Recently added</option>
      <option value="artist">Artist (A–Z)</option>
      <option value="year">Year (new → old)</option>
    </select>
  </label>
</div>

<input
  placeholder="Search your collection…"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  style={{
    width: "100%",
    maxWidth: 560,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    marginBottom: 16,
  }}
/>

<label style={{ display: "block", marginBottom: 16, color: "#666", fontSize: 13 }}>
  <input
    type="checkbox"
    checked={onlyWithPhotos}
    onChange={(e) => setOnlyWithPhotos(e.target.checked)}
    style={{ marginRight: 8 }}
  />
  Only show items with photos
</label>

<label style={{ display: "block", marginBottom: 16, color: "#666", fontSize: 13 }}>
  <input
    type="checkbox"
    checked={groupByArtist}
    onChange={(e) => setGroupByArtist(e.target.checked)}
    style={{ marginRight: 8 }}
  />
  Group by artist
</label>

      {message && <p>{message}</p>}

      <ul>
  {!groupByArtist &&
    visibleItems.map((row) => (
      <li key={row.id} style={{ marginBottom: 12 }}>
        <strong>{row.variants.designs.artists.name}</strong> —{" "}
        {row.variants.designs.year} – {row.variants.designs.title}
        <br />
        {row.variants.base_color} {row.variants.garment_type} —{" "}
        {row.variants.manufacturer}
        <br />
        Size: <strong>{row.size}</strong>
        {row.memory && (
          <>
            <br />
            <em>“{row.memory}”</em>
          </>
        )}

        {row.setlist_url && (
  <>
    <br />
    <a href={row.setlist_url} target="_blank" rel="noreferrer">
      Setlist.fm show
    </a>
  </>
)}

        {(ownershipPhotos[row.id] || []).length > 0 && (
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
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
                  <figcaption style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {p.label}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        <div className="upload-row">
          <input
            type="text"
            placeholder="Label (front, back, tag)…"
            data-label
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />

          <input type="file" accept="image/*" data-file />

          <button
            className="button-primary"
            onClick={(e) => {
              const wrap = (e.currentTarget.parentElement as HTMLElement) || null;
              if (!wrap) return;

              const labelInput = wrap.querySelector(
                "input[data-label]"
              ) as HTMLInputElement | null;
              const fileInput = wrap.querySelector(
                "input[data-file]"
              ) as HTMLInputElement | null;

              const label = labelInput?.value || "";
              const file = fileInput?.files?.[0];

              if (!file) {
                setMessage("Please choose an image file.");
                return;
              }

              uploadOwnershipPhoto(row.id, file, label);

              if (labelInput) labelInput.value = "";
              if (fileInput) fileInput.value = "";
            }}
          >
            Upload photo
          </button>
        </div>
      </li>
    ))}
</ul>

{groupByArtist && (
  <div>
    {groupedByArtist.map(([artistName, rows]) => (
      <section key={artistName} style={{ marginBottom: 22 }}>
        <h2 style={{ marginTop: 18, marginBottom: 10 }}>{artistName}</h2>
        <ul>
          {rows.map((row) => (
            <li key={row.id} style={{ marginBottom: 12 }}>
              {row.variants.designs.year} – {row.variants.designs.title}
              <br />
              {row.variants.base_color} {row.variants.garment_type} —{" "}
              {row.variants.manufacturer}
              <br />
              Size: <strong>{row.size}</strong>
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
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
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
                          style={{ fontSize: 12, color: "#666", marginTop: 4 }}
                        >
                          {p.label}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Label (condition, tag, damage)…"
                  data-label
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />

                <input type="file" accept="image/*" data-file />

                <button
                  className="button-primary"
                  onClick={(e) => {
                    const wrap =
                      (e.currentTarget.parentElement as HTMLElement) || null;
                    if (!wrap) return;

                    const labelInput = wrap.querySelector(
                      "input[data-label]"
                    ) as HTMLInputElement | null;
                    const fileInput = wrap.querySelector(
                      "input[data-file]"
                    ) as HTMLInputElement | null;

                    const label = labelInput?.value || "";
                    const file = fileInput?.files?.[0];

                    if (!file) {
                      setMessage("Please choose an image file.");
                      return;
                    }

                    uploadOwnershipPhoto(row.id, file, label);

                    if (labelInput) labelInput.value = "";
                    if (fileInput) fileInput.value = "";
                  }}
                >
                  Upload photo
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
)}

    </main>
  );
}