"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddVariantPage() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [designId, setDesignId] = useState("");

  const [garmentType, setGarmentType] = useState("t-shirt");
  const [baseColor, setBaseColor] = useState("black");
  const [cut, setCut] = useState("unisex");
  const [manufacturer, setManufacturer] = useState("Gildan");
  const [printMethod, setPrintMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDesigns() {
      // Pull designs with artist names so the dropdown is readable
      const { data } = await supabase
        .from("designs")
        .select("id,title,year, artists(name)")
        .order("year", { ascending: false });

      setDesigns(data || []);
    }

    loadDesigns();
  }, []);

  async function addVariant() {
    setMessage(null);

    if (!designId) {
      setMessage("Please select a design.");
      return;
    }

    if (!garmentType || !baseColor || !cut || !manufacturer) {
      setMessage("Please fill in garment type, color, cut, and manufacturer.");
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
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Variant added!");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>Add Variant</h1>

      <label>
        Design
        <select
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={designId}
          onChange={(e) => setDesignId(e.target.value)}
        >
          <option value="">Select design...</option>
          {designs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.artists?.name} — {d.year} — {d.title}
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
        <button onClick={addVariant}>Add Variant</button>
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  );
}