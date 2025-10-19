// src/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import Nav from "./components/Nav";

export const metadata = {
  title: "WedFlex",
  description: "Your Wedding. Your Town. Your WedFlex.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black">
        {/* Sticky white top bar */}
        <header className="sticky top-0 z-50 bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Nav />
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen bg-white">
          {children}
        </main>
      </body>
    </html>
  );
}
