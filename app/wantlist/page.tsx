"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function WantlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setMessage(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (!userId) {
        setMessage("Please sign in to view your wantlist.");
        return;
      }

      const { data, error } = await supabase
        .from("wantlist")
        .select(`
          id,
          created_at,
          variants:variant_id (
            id,
            base_color,
            garment_type,
            manufacturer,
            designs:design_id (
              id,
              title,
              year,
              artists:artist_id (
                id,
                name
              )
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        return;
      }

      setItems(data || []);
    }

    load();
  }, []);

  async function remove(id: string) {
    const { error } = await supabase.from("wantlist").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function moveToCollection(row: any) {
  setMessage(null);

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    setMessage("Please sign in first.");
    return;
  }

  const size = window.prompt("What size is it? (e.g., S, M, L, XL, XXL)");

  if (!size) {
    setMessage("Size is required.");
    return;
  }

  const memory = window.prompt(
    "Optional: any memory or story about getting this item?"
  );

  const setlistUrl = window.prompt(
  "Optional: Setlist.fm show link where you got this (paste URL)"
);
if (setlistUrl && !setlistUrl.includes("setlist.fm")) {
  setMessage("Please enter a valid Setlist.fm link.");
  return;
}

  const { error: insertError } = await supabase.from("ownership").insert({
    user_id: userId,
    variant_id: row.variants.id,
    size: size.trim(),
    memory: memory?.trim() || null,
    setlist_url: setlistUrl?.trim() || null,
  });

  if (insertError) {
    setMessage(insertError.message);
    return;
  }

  const { error: deleteError } = await supabase
    .from("wantlist")
    .delete()
    .eq("id", row.id);

  if (deleteError) {
    setMessage(deleteError.message);
    return;
  }

  setItems((prev) => prev.filter((x) => x.id !== row.id));

  setMessage("Moved to your collection.");
}

  return (
    <main>
      <h1>Wantlist</h1>

      {message && <p>{message}</p>}

      <ul style={{ lineHeight: 1.8 }}>
        {items.map((row) => (
          <li key={row.id} style={{ marginBottom: 12 }}>
            <a href={`/designs/${row.variants.designs.id}`} style={{ color: "inherit" }}>
              <strong>{row.variants.designs.artists.name}</strong> —{" "}
              {row.variants.designs.year} – {row.variants.designs.title}
              <br />
              {row.variants.base_color} {row.variants.garment_type} —{" "}
              {row.variants.manufacturer}
            </a>
            <div style={{ marginTop: 6 }}>
              <button className="button-primary" onClick={() => moveToCollection(row)}>
  I got this
</button>
<button onClick={() => remove(row.id)} style={{ marginLeft: 8 }}>
  Remove
</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}