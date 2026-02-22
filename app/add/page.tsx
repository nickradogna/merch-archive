export default function AddHubPage() {
  return (
    <main>
      <h1>Add</h1>
      <p style={{ color: "#666", marginTop: 6 }}>
        Add to the archive. If you’re not sure, start by searching to avoid
        duplicates.
      </p>

      <div className="add-grid">
        <a href="/add-design" className="add-card">
          <div className="add-card-inner">
            <h2 className="add-card-title">Design</h2>
            <p className="add-card-desc">
              Add a new design to an artist’s catalog (title, year, primary
              photo).
            </p>
            <div className="add-card-arrow">Add a design →</div>
          </div>
        </a>

        <a href="/add-variant" className="add-card">
          <div className="add-card-inner">
            <h2 className="add-card-title">Variant</h2>
            <p className="add-card-desc">
              Add a color / garment / manufacturer variant under an existing
              design.
            </p>
            <div className="add-card-arrow">Add a variant →</div>
          </div>
        </a>

        <a href="/add-artist" className="add-card">
          <div className="add-card-inner">
            <h2 className="add-card-title">Artist</h2>
            <p className="add-card-desc">
              Add a new artist. Please double-check they don’t already exist
              first.
            </p>
            <div className="add-card-arrow">Add an artist →</div>
          </div>
        </a>
      </div>
    </main>
  );
}