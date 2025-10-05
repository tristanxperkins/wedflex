"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/supabase/client";
import Link from "next/link";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setStatus(`Error: ${error.message}`);
      else if (data.session) setStatus("Signed in!");
      else setStatus("No session found.");
    });
  }, []);

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">Auth Callback</h1>
      <p className="mb-4">{status}</p>
      <Link href="/" className="text-blue-600">Go home</Link>
    </main>
  );
}
