export default function AddHubPage() {
  const cardStyle: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid #eee",
    borderRadius: 14,
    background: "#fff",
    padding: 18,
    minHeight: 170,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 8,
  };

  const descStyle: React.CSSProperties = {
    color: "#666",
    lineHeight: 1.4,
  };

  return (
    <main>
      <h1>Add</h1>
      <p style={{ color: "#666", marginTop: 6 }}>
        Add to the archive. If you’re not sure, start by searching to avoid
        duplicates.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        <a href="/add-design" className="hover-outline" style={cardStyle}>
          <div style={titleStyle}>Design</div>
          <div style={descStyle}>
            Add a new design to an artist’s catalog (title, year, primary photo).
          </div>
        </a>

        <a href="/add-variant" className="hover-outline" style={cardStyle}>
          <div style={titleStyle}>Variant</div>
          <div style={descStyle}>
            Add a color / garment / manufacturer variant under an existing design.
          </div>
        </a>

        <a href="/add-artist" className="hover-outline" style={cardStyle}>
          <div style={titleStyle}>Artist</div>
          <div style={descStyle}>
            Add a new artist. Please double-check they don’t already exist first.
          </div>
        </a>
      </div>
    </main>
  );
}