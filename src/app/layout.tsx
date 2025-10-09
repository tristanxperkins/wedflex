// src/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "WedFlex",
  description: "Disrupting the wedding industry — make money off weddings.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        {/* 🧭 NAV BAR (Persistent) */}
        <nav className="sticky top-0 z-50 flex justify-between items-center px-6 py-3 bg-white border-b shadow-sm">
          <Link href="/" className="font-bold text-xl text-purple-700">
            WedFlex
          </Link>

          <div className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/feed" className="hover:text-purple-600">
              Browse Offers
            </Link>
            <Link href="/post-offer" className="hover:text-purple-600">
              Post Offer
            </Link>
            <Link href="/auth/signin" className="hover:text-purple-600">
              Sign In
            </Link>
          </div>
        </nav>

        {/* 🧩 PAGE CONTENT */}
        <main>{children}</main>
      </body>
    </html>
  );
}
