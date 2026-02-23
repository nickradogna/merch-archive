"use client";

import React, { useEffect, useState } from "react";
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
  const [colorFilter, setColorFilter] = useState("");
const [typeFilter, setTypeFilter] = useState("");
const [manufacturerFilter, setManufacturerFilter] = useState("");

  useEffect(() => {
    async function load() {
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
      const variantIds = (variantsData || []).map((v: any) => v.id);

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

  async function markOwned(variantId: string) {
    setMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    const { data: existing } = await supabase
  .from("ownership")
  .select("id")
  .eq("user_id", userId)
  .eq("variant_id", variantId)
  .single();

if (existing) {
  setMessage("Already in your collection.");
  return;
}

    if (!userId) {
      setMessage("Please sign in first.");
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
  setMessage("Please enter a valid Setlist.fm link (it should start with setlist.fm).");
  return;
}

const { error } = await supabase.from("ownership").insert({
  user_id: userId,
  variant_id: variantId,
  size: size.trim(),
  memory: memory?.trim() || null,
  setlist_url: setlistUrl?.trim() || null,
});

    setMessage(error ? error.message : "Added to your collection.");
  }

  async function markWanted(variantId: string) {
  setMessage(null);

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  const { data: existing } = await supabase
  .from("wantlist")
  .select("id")
  .eq("user_id", userId)
  .eq("variant_id", variantId)
  .single();

if (existing) {
  setMessage("Already in your wantlist.");
  return;
}

  if (!userId) {
    setMessage("Please sign in first.");
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
    }}
  />
)}

      <h2>Variants</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
  <select
    value={colorFilter}
    onChange={(e) => setColorFilter(e.target.value)}
    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
  >
    <option value="">All colors</option>
    {[...new Set(variants.map((v) => v.base_color))].sort().map((c) => (
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
    {[...new Set(variants.map((v) => v.garment_type))].sort().map((t) => (
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
    {[...new Set(variants.map((v) => v.manufacturer))].sort().map((m) => (
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
  Showing{" "}
  {
    variants
      .filter((v) => (colorFilter ? v.base_color === colorFilter : true))
      .filter((v) => (typeFilter ? v.garment_type === typeFilter : true))
      .filter((v) => (manufacturerFilter ? v.manufacturer === manufacturerFilter : true))
      .length
  }{" "}
  of {variants.length} variants
</div>

      <ul>
        {variants
  .filter((v) => (colorFilter ? v.base_color === colorFilter : true))
  .filter((v) => (typeFilter ? v.garment_type === typeFilter : true))
  .filter((v) => (manufacturerFilter ? v.manufacturer === manufacturerFilter : true))
  .map((variant) => (
          <li key={variant.id} style={{ marginBottom: 12 }}>
            {variant.base_color} {variant.garment_type} — {variant.manufacturer}{" "}
            {variant.notes && (
  <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
    {variant.notes}
  </div>
)}
            <button className="button-primary" onClick={() => markOwned(variant.id)}>
  I own this
</button>
            <button onClick={() => markWanted(variant.id)} style={{ marginLeft: 8 }}>
  I want this
</button>
{(variantPhotos[variant.id] || []).length > 0 && (
  <div
    style={{
      marginTop: 10,
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
<div className="upload-row" style={{ marginTop: 10 }}>
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

      const labelInput = wrap.querySelector("input[data-label]") as HTMLInputElement | null;
      const fileInput = wrap.querySelector("input[data-file]") as HTMLInputElement | null;

      const label = labelInput?.value || "";
      const file = fileInput?.files?.[0];

      if (!file) {
        setMessage("Please choose an image file.");
        return;
      }

      uploadVariantPhoto(variant.id, file, label);

      // Clear inputs
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

      {message && <p>{message}</p>}
    </main>
  );
}