"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

type Props = { children: React.ReactNode };

export default function RequireAuth({ children }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sb = supabaseBrowser();

    sb.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/signin");
      else setIsLoading(false);
    });

    const { data: listener } = sb.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/signin");
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) return null;
  return <>{children}</>;
}
