"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddDesignPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [artistId, setArtistId] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [isArtistOpen, setIsArtistOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [circa, setCirca] = useState(""); // optional
  const [message, setMessage] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const artistWrapRef = useRef<HTMLDivElement | null>(null);
  const artistInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadArtists() {
      const { data } = await supabase.from("artists").select("id,name").order("name");
      setArtists(data || []);
    }
    loadArtists();
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const wrap = artistWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target as Node)) return;
      setIsArtistOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const selectedArtist = useMemo(() => {
    if (!artistId) return null;
    return artists.find((a) => a.id === artistId) || null;
  }, [artists, artistId]);

  const filteredArtists = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => String(a.name || "").toLowerCase().includes(q));
  }, [artists, artistQuery]);

  function chooseArtist(a: any) {
    setArtistId(a.id);
    setArtistQuery(a.name);
    setIsArtistOpen(false);
  }

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

      const { error: uploadError } = await supabase.storage.from("design-photos").upload(fileName, photoFile);

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("design-photos").getPublicUrl(fileName);
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
    setArtistId("");
    setArtistQuery("");
    setIsArtistOpen(false);
    setMessage("Design added!");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 520 }}>
      <h1>Add Design</h1>

      <label>
        Artist
        <div
          ref={artistWrapRef}
          style={{
            position: "relative",
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          <input
            ref={artistInputRef}
            value={artistQuery}
            onChange={(e) => {
              setArtistQuery(e.target.value);
              setIsArtistOpen(true);

              // if they start typing over a previous selection, clear the bound id
              if (artistId) setArtistId("");
            }}
            onFocus={() => setIsArtistOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsArtistOpen(false);
            }}
            placeholder="Search artists…"
            aria-label="Search artists"
            style={{
              display: "block",
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
            }}
          />

          {/* helper line */}
          <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
            {selectedArtist ? (
              <>
                Selected: <strong>{selectedArtist.name}</strong>
              </>
            ) : (
              <>Type to search, then click an artist.</>
            )}
          </div>

          {isArtistOpen && (
            <div
              role="listbox"
              aria-label="Artist results"
              style={{
                position: "absolute",
                zIndex: 20,
                left: 0,
                right: 0,
                top: "100%",
                marginTop: 8,
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                maxHeight: 260,
                overflow: "auto",
              }}
            >
              {filteredArtists.length ? (
                filteredArtists.slice(0, 50).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => chooseArtist(a)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom: "1px solid #f1f1f1",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    {a.name}
                  </button>
                ))
              ) : (
                <div style={{ padding: "10px 12px", color: "#777", fontSize: 13 }}>
                  No matches.
                </div>
              )}
            </div>
          )}
        </div>
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