"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddDesignPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [artistId, setArtistId] = useState("");
  const [title, setTitle] = useState("");
  const [circa, setCirca] = useState(""); // optional
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

    if (!artistId || !title.trim()) {
      setMessage("Please fill in Artist and Design title.");
      return;
    }

    // circa is optional; if provided, validate it
    let circaNumber: number | null = null;
    if (circa.trim()) {
      const n = Number(circa);
      if (!Number.isFinite(n) || n < 1900 || n > 2100) {
        setMessage("Circa must be a reasonable year (e.g., 1998).");
        return;
      }
      circaNumber = Math.trunc(n);
    }

    // upload optional primary photo
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

    // auth
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    const { error } = await supabase.from("designs").insert({
      artist_id: artistId,
      title: title.trim(),
      // year is no longer required; keep it null going forward
      year: null,
      circa: circaNumber,
      primary_photo_url: primaryPhotoUrl,
      created_by: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle("");
    setCirca("");
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
        Circa (optional)
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={circa}
          onChange={(e) => setCirca(e.target.value)}
          type="number"
          placeholder="e.g., 1998"
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