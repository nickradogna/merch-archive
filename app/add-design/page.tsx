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
      const { data } = await supabase
        .from("artists")
        .select("id,name")
        .order("name");
      setArtists(data || []);
    }
    loadArtists();
  }, []);

  async function addDesign() {
    setMessage(null);

    const finalTitle = title.trim();
    const yearNumber = Number(year);

    if (!artistId || !finalTitle || !year) {
      setMessage("Please fill in artist, title, and year.");
      return;
    }

    if (!Number.isFinite(yearNumber) || yearNumber < 1900 || yearNumber > 2100) {
      setMessage("Please enter a valid year (e.g., 2008).");
      return;
    }

    // Must be signed in
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    // Optional photo upload
    let primaryPhotoUrl: string | null = null;

    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop() || "jpg";
      const fileName = `${artistId}/design-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("design-photos")
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("design-photos")
        .getPublicUrl(fileName);

      primaryPhotoUrl = publicUrlData.publicUrl;
    }

    // Insert design
    const { error } = await supabase.from("designs").insert({
      artist_id: artistId,
      title: finalTitle,
      year: yearNumber,
      primary_photo_url: primaryPhotoUrl,
      created_by: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // Reset form
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
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            marginBottom: 12,
          }}
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
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            marginBottom: 12,
          }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label>
        Year
        <input
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            marginBottom: 12,
          }}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          type="number"
        />
      </label>

      <label>
        Primary photo (optional)
        <input
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            marginBottom: 12,
          }}
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