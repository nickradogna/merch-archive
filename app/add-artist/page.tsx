"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AddArtistPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function addArtist() {
  setMessage(null);

  const finalName = name.trim();
  const finalSlug = slug.trim() || slugify(finalName);

  if (!finalName) {
    setMessage("Please enter an artist name.");
    return;
  }

  // ===== ARTIST PHOTO UPLOAD (NEW) =====

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

  const { error } = await supabase.from("artists").insert({
    name: finalName,
    slug: finalSlug,
    photo_url: photoUrl,
  });

  if (error) {
    setMessage(error.message);
    return;
  }

  setName("");
  setSlug("");
  setMessage(`Added artist: ${finalName}`);
}

  return (
    <main style={{ padding: "2rem", maxWidth: 520 }}>
      <h1>Add Artist</h1>

      <label>
        Artist name
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={name}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            setSlug(slugify(v));
          }}
        />
      </label>

      <label>
        Slug (auto)
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </label>

      <div style={{ marginTop: 14 }}>
  <label style={{ display: "block", marginBottom: 6 }}>
    Artist photo (optional)
  </label>
  <input type="file" accept="image/*" id="artist-photo-input" />
</div>

      <button onClick={addArtist}>Add Artist</button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}