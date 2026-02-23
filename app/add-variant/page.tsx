"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ArtistRow = { id: string; name: string; slug?: string | null };
type DesignRow = {
  id: string;
  title: string;
  year: number | null;
  circa: number | null;
  artist_id: string;
};

export default function AddVariantPage() {
  // ---- artist/design pickers ----
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistId, setArtistId] = useState("");

  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [designId, setDesignId] = useState("");

  // ---- fields ----
  const [garmentType, setGarmentType] = useState("t-shirt");
  const [baseColor, setBaseColor] = useState("black");
  const [cut, setCut] = useState("unisex");
  const [manufacturer, setManufacturer] = useState("Gildan");
  const [printMethod, setPrintMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  // Load artists once
  useEffect(() => {
    async function loadArtists() {
      const { data, error } = await supabase
        .from("artists")
        .select("id,name,slug")
        .order("name", { ascending: true });

      if (error) {
        setMessage(error.message);
        setArtists([]);
        return;
      }

      setArtists((data as any[]) || []);
    }

    loadArtists();
  }, []);

  // Load designs when artist changes
  useEffect(() => {
    async function loadDesignsForArtist() {
      setDesigns([]);
      setDesignId("");

      if (!artistId) return;

      const { data, error } = await supabase
        .from("designs")
        .select("id,title,year,circa,artist_id")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setDesigns([]);
        return;
      }

      setDesigns(((data as any[]) || []) as DesignRow[]);
    }

    loadDesignsForArtist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  const filteredArtists = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, artistQuery]);

  function circaLabel(d: DesignRow) {
    if (d.circa) return `Circa ${d.circa}`;
    if (d.year) return `Circa ${d.year}`; // fallback for older data
    return "";
  }

  async function addVariant() {
    setMessage(null);

    if (!artistId) {
      setMessage("Please select an artist.");
      return;
    }

    if (!designId) {
      setMessage("Please select a design.");
      return;
    }

    if (!garmentType || !baseColor || !cut || !manufacturer) {
      setMessage("Please fill in garment type, color, cut, and manufacturer.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    const { error } = await supabase.from("variants").insert({
      design_id: designId,
      garment_type: garmentType.trim(),
      base_color: baseColor.trim(),
      cut: cut.trim(),
      manufacturer: manufacturer.trim(),
      print_method: printMethod.trim() || null,
      notes: notes.trim() || null,
      created_by: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // reset just the variant fields; keep artist/design selected for faster entry
    setPrintMethod("");
    setNotes("");
    setMessage("Variant added!");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>Add Variant</h1>

      {/* Artist (searchable) */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block" }}>
          Artist
          <input
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              marginBottom: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
            value={artistQuery}
            onChange={(e) => setArtistQuery(e.target.value)}
            placeholder="Begin typing artist and select below..."
          />
        </label>

        <select
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
        >
          <option value="">Select artist…</option>
          {filteredArtists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Design (depends on artist) */}
      <label style={{ display: "block" }}>
        Design
        <select
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
          value={designId}
          onChange={(e) => setDesignId(e.target.value)}
          disabled={!artistId}
          title={!artistId ? "Select an artist first" : "Select a design"}
        >
          <option value="">
            {!artistId ? "Select an artist first…" : "Select design…"}
          </option>
          {designs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
              {circaLabel(d) ? ` — ${circaLabel(d)}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          Garment type
          <input
            list="garment-types"
            style={{ display: "block", width: "100%", marginTop: 4 }}
            value={garmentType}
            onChange={(e) => setGarmentType(e.target.value)}
          />
          <datalist id="garment-types">
            <option value="t-shirt" />
            <option value="longsleeve" />
            <option value="tank" />
            <option value="hoodie" />
            <option value="crewneck" />
            <option value="zip hoodie" />
            <option value="jersey" />
            <option value="hat" />
            <option value="beanie" />
            <option value="patch" />
            <option value="poster" />
          </datalist>
        </label>

        <label>
          Base color
          <input
            list="base-colors"
            style={{ display: "block", width: "100%", marginTop: 4 }}
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
          />
          <datalist id="base-colors">
            <option value="black" />
            <option value="white" />
            <option value="gray" />
            <option value="red" />
            <option value="blue" />
            <option value="green" />
            <option value="yellow" />
            <option value="brown" />
            <option value="purple" />
            <option value="pink" />
            <option value="tie-dye" />
          </datalist>
        </label>

        <label>
          Cut
          <input
            style={{ display: "block", width: "100%", marginTop: 4 }}
            value={cut}
            onChange={(e) => setCut(e.target.value)}
          />
        </label>

        <label>
          Manufacturer
          <input
            list="manufacturers"
            style={{ display: "block", width: "100%", marginTop: 4 }}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
          <datalist id="manufacturers">
            <option value="Gildan" />
            <option value="Gildan Heavy Cotton" />
            <option value="Hanes" />
            <option value="Fruit of the Loom" />
            <option value="Tultex" />
            <option value="Jerzees" />
            <option value="Anvil" />
            <option value="Next Level" />
            <option value="Bella+Canvas" />
            <option value="American Apparel" />
            <option value="Comfort Colors" />
            <option value="Independent Trading Co." />
            <option value="Colortone" />
          </datalist>
        </label>

        <label>
          Print method (optional)
          <input
            style={{ display: "block", width: "100%", marginTop: 4 }}
            value={printMethod}
            onChange={(e) => setPrintMethod(e.target.value)}
          />
        </label>

        <label>
          Notes (optional)
          <textarea
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              minHeight: 80,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={addVariant} disabled={!designId}>
          Add Variant
        </button>
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}