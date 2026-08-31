"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth/token";
import { useCurrentUser } from "@/features/auth/useCurrentUser";

export default function Home() {
  const router = useRouter();
  const { data, isError } = useCurrentUser();

  useEffect(() => {
    if (!getStoredToken() || isError) {
      router.replace("/login");
      return;
    }
    if (data) {
      router.replace(data.role === "RECRUITER" ? "/recruiter" : "/candidate");
    }
  }, [data, isError, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </main>
  );
}
