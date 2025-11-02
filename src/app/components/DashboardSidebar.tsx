"use client";

import Link from "next/link";
import { useState } from "react";

type Role = "couple" | "wedflexer";

export default function DashboardSidebar({ role }: { role: Role }) {
  const [busy, setBusy] = useState(false);

  async function switchRole() {
    try {
      setBusy(true);
      const target: Role = role === "couple" ? "wedflexer" : "couple";
      const res = await fetch("/api/me/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: target }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      window.location.href = "/dashboard"; // router will redirect to correct sub-dashboard
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const coupleItems = [
    { href: "/dashboard/couple", label: "Overview" },
    { href: "/dashboard/couple/profile", label: "Profile" },
    { href: "/dashboard/couple/calendar", label: "Calendar" },
    { href: "/dashboard/couple/budget", label: "Budget" },
    { href: "/dashboard/couple/messages", label: "Messages" },
  ];

  const wedflexerItems = [
    { href: "/dashboard/wedflexer", label: "Overview" },
    { href: "/dashboard/wedflexer/profile", label: "Profile" },
    { href: "/dashboard/wedflexer/calendar", label: "Calendar" },
    { href: "/dashboard/wedflexer/earnings", label: "Earnings" },
    { href: "/dashboard/wedflexer/messages", label: "Messages" },
  ];

  const items = role === "couple" ? coupleItems : wedflexerItems;

  return (
    <aside className="border rounded-xl p-4 h-max">
      <nav className="flex flex-col gap-2">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="px-3 py-2 rounded hover:bg-purple-50 text-sm"
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
