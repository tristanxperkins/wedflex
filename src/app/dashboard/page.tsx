"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../components/RequireAuth";
import { supabaseBrowser } from "../supabase/client";

export default function DashboardRouter() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) { router.replace("/signin"); return; }
      const { data: prof } = await sb
        .from("profiles")
        .select("active_role")
        .eq("id", me.user.id)
        .single();
      const role = (prof?.active_role as "couple"|"wedflexer"|null) ?? "couple";
      router.replace(role === "wedflexer" ? "/dashboard/wedflexer" : "/dashboard/couple");
    })();
  }, [router]);

  return (
    <RequireAuth>
      <main className="p-6">Loading dashboard…</main>
    </RequireAuth>
  );
}