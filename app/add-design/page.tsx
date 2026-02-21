"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddDesignPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [artistId, setArtistId] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadArtists() {
      const { data } = await supabase.from("artists").select("id,name").order("name");
      setArtists(data || []);
    }
    loadArtists();
  }, []);

  async function addDesign() {
    setMessage(null);

    if (!artistId || !title || !year) {
      setMessage("Please fill in all fields.");
      return;
    }

    let primaryPhotoUrl: string | null = null;

if (photoFile) {
  const fileExt = photoFile.name.split(".").pop() || "jpg";
  const fileName = `design-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("design-photos")
    .upload(fileName, photoFile);

  if (uploadError) {
    setMessage(uploadError.message);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("design-photos")
    .getPublicUrl(fileName);

  primaryPhotoUrl = publicUrlData.publicUrl;
}

const { error } = await supabase.from("designs").insert({
  artist_id: artistId,
  title: title.trim(),
  year: parseInt(year),
  primary_photo_url: primaryPhotoUrl,
});

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setYear("");
    setPhotoFile(null);
    setMessage("Design added!");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 520 }}>
      <h1>Add Design</h1>

      <label>
        Artist
        <select
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
        >
          <option value="">Select artist...</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Design title
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label>
        Year
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          type="number"
        />
      </label>

      <label>
  Primary photo (optional)
  <input
    style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
    type="file"
    accept="image/*"
    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
  />
</label>

      <button onClick={addDesign}>Add Design</button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}