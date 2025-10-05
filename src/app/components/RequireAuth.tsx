"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client"; // note the relative path from /app/components

type Props = { children: React.ReactNode };

export default function RequireAuth({ children }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/signin");
      } else {
        setReady(true);
      }
    });
  }, [router]);

  if (!ready) return null; // could render a spinner
  return <>{children}</>;
}
