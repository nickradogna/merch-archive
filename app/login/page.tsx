"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function signUp() {
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : "Signed up! You can now sign in.");
  }

  async function signIn() {
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Signed in!");
  }

  async function signOut() {
    setMessage(null);
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : "Signed out.");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 480 }}>
      <h1>Login</h1>

      <label>
        Email
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
      </label>

      <label>
        Password
        <input
          style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 12 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
      </label>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={signUp}>Sign up</button>
        <button onClick={signIn}>Sign in</button>
        <button onClick={signOut}>Sign out</button>
      </div>

      {message && <p>{message}</p>}
    </main>
  );
}