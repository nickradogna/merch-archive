"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeCountry(input: string) {
  // Keep it simple: allow "US" or "United States" etc.
  // If they type 2 letters, force uppercase.
  const v = input.trim();
  if (v.length === 2) return v.toUpperCase();
  return v;
}

export default function AddArtistPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [originCountry, setOriginCountry] = useState("");
  const [primaryGenre, setPrimaryGenre] = useState("");

  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);

  const baseNameSlug = useMemo(() => slugify(name), [name]);

  // If duplicates exist, build a suggested disambiguated slug
  const suggestedDisambiguatedSlug = useMemo(() => {
    if (!baseNameSlug) return "";
    if (!nameExists) return baseNameSlug;

    const c = slugify(normalizeCountry(originCountry));
    const g = slugify(primaryGenre);

    // only add suffix parts if present
    const parts = [baseNameSlug];
    if (c) parts.push(c);
    if (g) parts.push(g);

    return parts.join("-");
  }, [baseNameSlug, nameExists, originCountry, primaryGenre]);

  // Keep slug synced to either basic or disambiguated suggestion
  useEffect(() => {
    if (!name.trim()) {
      setSlug("");
      return;
    }

    // If duplicates exist, prefer the disambiguated suggestion
    if (nameExists) {
      setSlug(suggestedDisambiguatedSlug || baseNameSlug);
    } else {
      setSlug(baseNameSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameExists, suggestedDisambiguatedSlug, baseNameSlug]);

  async function checkNameExists(artistName: string) {
    const finalName = artistName.trim();
    if (!finalName) {
      setNameExists(false);
      return;
    }

    setCheckingName(true);

    const { data, error } = await supabase
      .from("artists")
      .select("id")
      .eq("name", finalName)
      .limit(1);

    setCheckingName(false);

    if (error) {
      // If check fails, don't force extra fields—just let insert handle it.
      setNameExists(false);
      return;
    }

    setNameExists((data || []).length > 0);
  }

  async function findAvailableSlug(desired: string) {
    let candidate = desired.trim();
    if (!candidate) return "";

    // If candidate already exists, append -2, -3, ...
    for (let i = 0; i < 50; i++) {
      const attempt = i === 0 ? candidate : `${candidate}-${i + 1}`;

      const { data, error } = await supabase
        .from("artists")
        .select("id")
        .eq("slug", attempt)
        .limit(1);

      if (error) return attempt; // fallback: let DB constraint decide
      if (!data || data.length === 0) return attempt;
    }

    // extreme fallback
    return `${candidate}-${Date.now()}`;
  }

  async function addArtist() {
  setMessage(null);

  const finalName = name.trim();
  if (!finalName) {
    setMessage("Please enter an artist name.");
    return;
  }

  // Check duplicates by name (DO NOT rely on React state here)
  const { data: dupes, error: dupErr } = await supabase
    .from("artists")
    .select("id")
    .eq("name", finalName)
    .limit(1);

  if (dupErr) {
    setMessage(dupErr.message);
    return;
  }

  const hasDuplicateName = (dupes || []).length > 0;

  // If duplicates exist, require country + genre
  const countryRaw = normalizeCountry(originCountry).trim();
  const genreRaw = primaryGenre.trim();

  if (hasDuplicateName && (!countryRaw || !genreRaw)) {
    setMessage(
      "That artist name already exists. Please add Country of origin and Primary genre to distinguish it."
    );
    return;
  }

  // Build desired slug:
  // - unique name => "metallica"
  // - duplicate name => "metallica-us-metal"
  const base = slugify(finalName);

  let desiredSlug = base;

  if (hasDuplicateName) {
    const c = slugify(countryRaw);
    const g = slugify(genreRaw);
    desiredSlug = [base, c, g].filter(Boolean).join("-");
  } else {
    // allow manual override if user edited the slug field
    desiredSlug = (slug || "").trim() || base;
  }

  // Ensure slug is available (adds -2, -3, etc. if needed)
  const finalSlug = await findAvailableSlug(desiredSlug);

  // ===== ARTIST PHOTO UPLOAD =====
  let photoUrl: string | null = null;

  const fileInput = document.getElementById(
    "artist-photo-input"
  ) as HTMLInputElement | null;

  const file = fileInput?.files?.[0];

  if (file) {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${finalSlug}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("artist-photos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("artist-photos")
      .getPublicUrl(filePath);

    photoUrl = data.publicUrl;
  }

  // ===== SAVE ARTIST =====
  const { data: auth } = await supabase.auth.getUser();
const userId = auth.user?.id;

if (!userId) {
  setMessage("Please sign in first.");
  return;
}

const { error } = await supabase.from("artists").insert({
  name: finalName,
  slug: finalSlug,
  photo_url: photoUrl,
  origin_country: originCountry?.trim() || null,
  primary_genre: primaryGenre?.trim() || null,
  created_by: userId,
});

  if (error) {
    if ((error as any).code === "23505") {
      setMessage(
        "That artist URL already exists. Please tweak country/genre and try again."
      );
      return;
    }
    setMessage(error.message);
    return;
  }

  // reset
  setName("");
  setSlug("");
  setOriginCountry("");
  setPrimaryGenre("");
  setNameExists(false);
  setMessage(`Added artist: ${finalName}`);
  if (fileInput) fileInput.value = "";
}

  return (
  <main style={{ padding: "2rem", maxWidth: 520 }}>
    <h1>Add Artist</h1>

    <label>
      Artist name
      <input
        style={{
          display: "block",
          width: "100%",
          marginTop: 4,
          marginBottom: 10,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          setName(v);
          setMessage(null);
        }}
        onBlur={() => checkNameExists(name)}
        placeholder="e.g. Weezer"
      />
    </label>

    <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>
      {checkingName ? (
        <>Checking for duplicates…</>
      ) : nameExists ? (
        <>That name already exists — country + genre are required.</>
      ) : name.trim() ? (
        <>Country + genre are optional, but recommended.</>
      ) : (
        <> </> // keep spacing
      )}
    </div>

    <label>
      Country of origin {nameExists ? "(required)" : "(optional)"}
      <input
        style={{
          display: "block",
          width: "100%",
          marginTop: 4,
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
        value={originCountry}
        onChange={(e) => {
          setOriginCountry(e.target.value);
          setMessage(null);
        }}
        placeholder="e.g. US or United States"
      />
    </label>

    <label>
      Primary genre {nameExists ? "(required)" : "(optional)"}
      <input
        style={{
          display: "block",
          width: "100%",
          marginTop: 4,
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
        value={primaryGenre}
        onChange={(e) => {
          setPrimaryGenre(e.target.value);
          setMessage(null);
        }}
        placeholder="e.g. Death metal"
      />
    </label>

    <label>
      Slug (auto)
      <input
        style={{
          display: "block",
          width: "100%",
          marginTop: 4,
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
    </label>

    <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
      Suggested URL:{" "}
      <code>
        /artists/
        {nameExists
          ? suggestedDisambiguatedSlug || slug
          : slug || slugify(name || "")}
      </code>
    </div>

    <div style={{ marginTop: 14 }}>
      <label style={{ display: "block", marginBottom: 6 }}>
        Artist photo (optional)
      </label>
      <input type="file" accept="image/*" id="artist-photo-input" />
    </div>

    <div style={{ marginTop: 16 }}>
      <button className="button-primary" onClick={addArtist}>
        Add Artist
      </button>
    </div>

    {message && <p style={{ marginTop: 12 }}>{message}</p>}
  </main>
);
}