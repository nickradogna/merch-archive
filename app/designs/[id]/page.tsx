"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: designId } = React.use(params);

  const [design, setDesign] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [variantPhotos, setVariantPhotos] = useState<Record<string, any[]>>({});
  const [ownedCountMap, setOwnedCountMap] = useState<Record<string, number>>({});

  const [colorFilter, setColorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");

  useEffect(() => {
    async function load() {
      setMessage(null);

      const { data: designData } = await supabase
        .from("designs")
        .select("*")
        .eq("id", designId)
        .single();

      const { data: variantsData } = await supabase
        .from("variants")
        .select("*")
        .eq("design_id", designId);

      setDesign(designData);
      setVariants(variantsData || []);

      const variantIds = (variantsData || []).map((v: any) => v.id).filter(Boolean);

      // --- owned counts per variant (RPC) ---
      if (variantIds.length) {
        const { data: countsData, error: countsErr } = await supabase.rpc(
          "variant_owned_counts",
          { variant_ids: variantIds }
        );

        if (!countsErr && countsData) {
          const map: Record<string, number> = {};
          (countsData as any[]).forEach((r) => {
            if (r?.variant_id) map[String(r.variant_id)] = Number(r.owned_count || 0);
          });
          setOwnedCountMap(map);
        } else {
          setOwnedCountMap({});
        }
      } else {
        setOwnedCountMap({});
      }

      // --- variant photos ---
      if (variantIds.length) {
        const { data: photoRows } = await supabase
          .from("variant_photos")
          .select("*")
          .in("variant_id", variantIds)
          .order("created_at", { ascending: true });

        const grouped: Record<string, any[]> = {};
        (photoRows || []).forEach((p: any) => {
          grouped[p.variant_id] = grouped[p.variant_id] || [];
          grouped[p.variant_id].push(p);
        });

        setVariantPhotos(grouped);
      } else {
        setVariantPhotos({});
      }
    }

    load();
  }, [designId]);

  const filteredVariants = useMemo(() => {
    return variants
      .filter((v) => (colorFilter ? v.base_color === colorFilter : true))
      .filter((v) => (typeFilter ? v.garment_type === typeFilter : true))
      .filter((v) =>
        manufacturerFilter ? v.manufacturer === manufacturerFilter : true
      );
  }, [variants, colorFilter, typeFilter, manufacturerFilter]);

  async function markOwned(variantId: string) {
    setMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    const { data: existing } = await supabase
      .from("ownership")
      .select("id")
      .eq("user_id", userId)
      .eq("variant_id", variantId)
      .maybeSingle();

    if (existing) {
      setMessage("Already in your collection.");
      return;
    }

    const size = window.prompt("What size is it? (e.g., S, M, L, XL, XXL)");
    if (!size) {
      setMessage("Size is required to add to your collection.");
      return;
    }

    const memory = window.prompt(
      "Optional: any memory or story about getting this item?"
    );

    const rawSetlistUrl = window.prompt(
      "Optional: Setlist.fm show link where you got this (paste URL)"
    );

    const setlistUrl = rawSetlistUrl?.trim() || "";
    if (setlistUrl && !/^https?:\/\/(www\.)?setlist\.fm\//i.test(setlistUrl)) {
      setMessage(
        "Please enter a valid Setlist.fm link (it should start with setlist.fm)."
      );
      return;
    }

    const { error } = await supabase.from("ownership").insert({
      user_id: userId,
      variant_id: variantId,
      size: size.trim(),
      memory: memory?.trim() || null,
      setlist_url: setlistUrl?.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // Optimistically bump the owned count for this variant
    setOwnedCountMap((prev) => ({
      ...prev,
      [variantId]: (prev[variantId] || 0) + 1,
    }));

    setMessage("Added to your collection.");
  }

  async function markWanted(variantId: string) {
    setMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    const { data: existing } = await supabase
      .from("wantlist")
      .select("id")
      .eq("user_id", userId)
      .eq("variant_id", variantId)
      .maybeSingle();

    if (existing) {
      setMessage("Already in your wantlist.");
      return;
    }

    const { error } = await supabase.from("wantlist").insert({
      user_id: userId,
      variant_id: variantId,
    });

    setMessage(error ? error.message : "Added to your wantlist.");
  }

  async function uploadVariantPhoto(variantId: string, file: File, label?: string) {
    setMessage(null);

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `variant-${variantId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("variant-photos")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("variant-photos")
      .getPublicUrl(fileName);

    const url = publicUrlData.publicUrl;

    const { error: insertError } = await supabase.from("variant_photos").insert({
      variant_id: variantId,
      url,
      label: label?.trim() || null,
    });

    if (insertError) {
      setMessage(insertError.message);
      return;
    }

    // Update UI immediately
    setVariantPhotos((prev) => {
      const next = { ...prev };
      const arr = next[variantId] ? [...next[variantId]] : [];
      arr.push({ id: crypto.randomUUID(), variant_id: variantId, url, label });
      next[variantId] = arr;
      return next;
    });

    setMessage("Photo uploaded.");
  }

  if (!design) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>
        {design.year} – {design.title}
      </h1>

      {design.primary_photo_url && (
        <img
          src={design.primary_photo_url}
          alt={`${design.year} – ${design.title}`}
          style={{
            display: "block",
            maxWidth: 520,
            width: "100%",
            height: "auto",
            marginTop: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #e0e0e0",
            background: "#f2f2f2",
          }}
        />
      )}

      <h2>Variants</h2>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <select
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          <option value="">All colors</option>
          {[...new Set(variants.map((v) => v.base_color))]
            .filter(Boolean)
            .sort()
            .map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          <option value="">All types</option>
          {[...new Set(variants.map((v) => v.garment_type))]
            .filter(Boolean)
            .sort()
            .map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
        </select>

        <select
          value={manufacturerFilter}
          onChange={(e) => setManufacturerFilter(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          <option value="">All manufacturers</option>
          {[...new Set(variants.map((v) => v.manufacturer))]
            .filter(Boolean)
            .sort()
            .map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </select>

        <button
          onClick={() => {
            setColorFilter("");
            setTypeFilter("");
            setManufacturerFilter("");
          }}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginBottom: 12, color: "#666", fontSize: 13 }}>
        Showing {filteredVariants.length} of {variants.length} variants
      </div>

      <ul style={{ paddingLeft: 18 }}>
        {filteredVariants.map((variant) => {
          const ownedCount = ownedCountMap[variant.id] ?? 0;

          return (
            <li key={variant.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600 }}>
                {variant.base_color} {variant.garment_type} — {variant.manufacturer}
              </div>

              <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
                Owned by <strong>{ownedCount}</strong>{" "}
                {ownedCount === 1 ? "collector" : "collectors"}
              </div>

              {variant.notes && (
                <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
                  {variant.notes}
                </div>
              )}

              {/* Action buttons (stay together on mobile) */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <button
                  className="button-primary"
                  onClick={() => markOwned(variant.id)}
                >
                  I own this
                </button>
                <button onClick={() => markWanted(variant.id)}>I want this</button>
              </div>

              {/* Photo grid */}
              {(variantPhotos[variant.id] || []).length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  {(variantPhotos[variant.id] || []).map((p: any) => (
                    <figure key={p.id} style={{ margin: 0 }}>
                      <img
                        src={p.url}
                        alt={p.label || "Variant photo"}
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

              {/* Upload row (responsive, no horizontal scroll) */}
              <div
                className="upload-row"
                style={{
                  marginTop: 12,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "1fr",
                  maxWidth: 640,
                }}
              >
                <input
                  type="text"
                  placeholder="Label (front, back, tag)…"
                  data-label
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    data-file
                    style={{
                      width: "100%",
                    }}
                  />

                  <button
                    className="button-primary"
                    onClick={(e) => {
                      const wrap =
                        (e.currentTarget.parentElement?.parentElement as HTMLElement) ||
                        null;
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

                      uploadVariantPhoto(variant.id, file, label);

                      if (labelInput) labelInput.value = "";
                      if (fileInput) fileInput.value = "";
                    }}
                  >
                    Upload photo
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {message && <p style={{ marginTop: 14 }}>{message}</p>}
    </main>
  );
}