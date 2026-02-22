import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Merch Archive",
  description: "A clean, collector-first archive for band merch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#f8f8f8",
          color: "#111",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "40px 24px",
          }}
        >
          <header
            style={{
              borderBottom: "1px solid #eee",
              paddingBottom: 16,
              marginBottom: 28,
            }}
          >
            <nav
              style={{
                display: "flex",
                gap: 14,
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <a href="/" className="nav-brand">
                Merch Archive
              </a>

              <a href="/artists" className="nav-link">
                Artists
              </a>

              <a href="/search" className="nav-link">
                Search
              </a>

              <a href="/collection" className="nav-link">
                My Collection
              </a>

              <a href="/wantlist" className="nav-link">
                Wantlist
              </a>

              <a href="/add-artist" className="nav-link">
                Add Artist
              </a>

              <a href="/add-design" className="nav-link">
                Add Design
              </a>

              <a href="/add-variant" className="nav-link">
                Add Variant
              </a>

              <span style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
  <a href="/profile" className="nav-link">
    Profile
  </a>
  <a href="/login" className="nav-link">
    Login
  </a>
</span>
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}