"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MyProfileRedirectPage() {
  const [msg, setMsg] = useState("Loading…");

  useEffect(() => {
    async function go() {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .single();

      if (!profile?.username) {
        setMsg("No profile found yet. Please create one in Edit Profile.");
        return;
      }

      window.location.href = `/u/${profile.username}`;
    }

    go();
  }, []);

  return (
    <main>
      <h1>Profile</h1>
      <p style={{ color: "#666" }}>{msg}</p>
      <p style={{ marginTop: 12 }}>
        <a className="button-primary" href="/profile/edit">
          Edit profile
        </a>
      </p>
    </main>
  );
}