import type { Metadata } from "next";
import "./globals.css";
import NavLinks from "./NavLinks";

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
          backgroundColor: "#f1f2f4",
          color: "#111",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "40px var(--page-padding)",
          }}
        >
          <header
  className="site-header"
  style={{
    borderBottom: "1px solid #eee",
    paddingBottom: 16,
    marginBottom: 28,
  }}
>
            <NavLinks />
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}