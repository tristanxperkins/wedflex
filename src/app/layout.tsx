import "./globals.css";
import type { Metadata } from "next";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "WedFlex",
  description: "Your Wedding. Your Town. Your WedFlex.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* brand base colors */}
      <body className="bg-white text-slate-900">
        {/* Single, sticky, white nav row */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Nav />
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
