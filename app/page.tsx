export default function HomePage() {
  return (
    <main style={{ padding: "3rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 14,
            height: 14,
            background: "#111",
            borderRadius: 3,
          }}
        />
        <h1
  style={{
    margin: 0,
    fontSize: 44,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  }}
>
  Merch Archive
</h1>
      </div>

      <p style={{ marginTop: 14, color: "#666", lineHeight: 1.6, maxWidth: 720 }}>
        A clean, collector-first database for band merch—catalog designs, track variants,
        document your personal items, and preserve the story of how you got them.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
        <a href="/artists">
          <button className="button-primary">Browse artists</button>
        </a>
        <a href="/collection">
          <button>My collection</button>
        </a>
        <a href="/wantlist">
          <button>Wantlist</button>
        </a>
        <a href="/add-artist">
          <button>Add artist</button>
        </a>
        <a href="/add-design">
          <button>Add design</button>
        </a>
        <a href="/add-variant">
          <button>Add variant</button>
        </a>
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid #eee", paddingTop: 18 }}>
        <p style={{ margin: 0, color: "#777", fontSize: 13, lineHeight: 1.6 }}>
          Minimal by design. Community maintained. Built for collectors.
        </p>
      </div>
    </main>
  );
}