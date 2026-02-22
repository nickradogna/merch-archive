"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
  is_collection_public: boolean | null;
};

function slugifyUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 32);
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    null | "available" | "taken"
  >(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;

      if (!uid) {
        setLoading(false);
        setMessage("Please sign in first.");
        return;
      }

      setUserId(uid);

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id,username,bio,avatar_url,link_url,is_collection_public")
        .eq("user_id", uid)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setLinkUrl(profile.link_url || "");
        setIsPublic(profile.is_collection_public ?? true);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function checkUsernameAvailability(candidate: string) {
    if (!userId) return null;

    const u = slugifyUsername(candidate);
    if (!u) {
      setUsernameStatus(null);
      return null;
    }

    setCheckingUsername(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", u)
      .maybeSingle();

    setCheckingUsername(false);

    if (error) {
      // If something weird happens, don't block save—just don't show status.
      setUsernameStatus(null);
      return null;
    }

    // If no row exists -> available
    if (!data) {
      setUsernameStatus("available");
      return true;
    }

    // If the row exists but it's you -> available
    if (data.user_id === userId) {
      setUsernameStatus("available");
      return true;
    }

    // Otherwise -> taken
    setUsernameStatus("taken");
    return false;
  }

  async function uploadAvatar(file: File) {
    if (!userId) return null;

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage(uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function saveProfile() {
    setMessage(null);

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    const finalUsername = slugifyUsername(username);

    if (!finalUsername) {
      setMessage("Username is required.");
      return;
    }

    if (bio.length > 100) {
      setMessage("Bio must be 100 characters or less.");
      return;
    }

    // Check username uniqueness before saving
    const ok = await checkUsernameAvailability(finalUsername);
    if (ok === false) {
      setMessage("That username is already taken.");
      return;
    }

    // optional avatar upload
    const fileInput = document.getElementById(
      "avatar-input"
    ) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    let avatarUrlToSave: string | null = null;
    if (file) {
      const url = await uploadAvatar(file);
      if (!url) return;
      avatarUrlToSave = url;
    }

    const payload: Partial<ProfileRow> & { user_id: string; username: string } =
      {
        user_id: userId,
        username: finalUsername,
        bio: bio.trim() || null,
        link_url: linkUrl.trim() || null,
        is_collection_public: isPublic,
      };

    if (avatarUrlToSave) payload.avatar_url = avatarUrlToSave;

    const { error } = await supabase.from("profiles").upsert(payload, {
      onConflict: "user_id",
    });

    if (error) {
      // Friendly message for unique constraint violations (username taken)
      if ((error as any).code === "23505") {
        setMessage("That username is already taken.");
        setUsernameStatus("taken");
        return;
      }

      setMessage(error.message);
      return;
    }

    // Keep input formatted after save
    setUsername(finalUsername);

    // clear file input after save
    if (fileInput) fileInput.value = "";

    setMessage("Profile saved.");
  }

  if (loading) return <p>Loading…</p>;

  const publicUrl = username.trim() ? `/users/${slugifyUsername(username)}` : "";

  return (
    <main style={{ maxWidth: 720 }}>
      <h1>Your Profile</h1>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        <label>
          Username (public URL)
          <input
            value={username}
            onChange={(e) => {
              const formatted = slugifyUsername(e.target.value);
              setUsername(formatted);
              setUsernameStatus(null);
            }}
            onBlur={() => checkUsernameAvailability(username)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
            placeholder="e.g. nickradogna"
          />

          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            {checkingUsername ? (
              <>Checking…</>
            ) : usernameStatus === "available" ? (
              <span style={{ color: "#1b7f3a" }}>Available</span>
            ) : usernameStatus === "taken" ? (
              <span style={{ color: "#b00020" }}>Taken</span>
            ) : (
              <>Lowercase letters, numbers, and hyphens only.</>
            )}
          </div>
        </label>

        <label>
          Bio (max 100 characters)
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              resize: "vertical",
            }}
            placeholder="Short collector bio…"
          />
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            {bio.length}/100
          </div>
        </label>

        <label>
          External link (optional)
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
            placeholder="https://…"
          />
        </label>

        <label>
          Profile picture (optional)
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            style={{ display: "block", marginTop: 6 }}
          />
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make my collection public
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button-primary" onClick={saveProfile}>
            Save profile
          </button>

          {publicUrl && (
            <a href={publicUrl} style={{ alignSelf: "center" }}>
              View public profile →
            </a>
          )}
        </div>
      </div>
    </main>
  );
}