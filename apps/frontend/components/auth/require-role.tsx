"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { useAuthStore } from "@/stores/auth.store";
import { getStoredToken } from "@/lib/auth/token";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { LoadingState } from "@/components/layout/loading-state";
import type { Role } from "@/types/api";

interface RequireRoleProps {
  role: Role;
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const router = useRouter();
  // localStorage isn't available during SSR, so this component must render
  // the same "not ready yet" output on the server and on the client's first
  // pass — otherwise React flags a hydration mismatch. `mounted` only flips
  // true after that first pass, once it's safe to read the token.
  const mounted = useHasMounted();
  const setUser = useAuthStore((state) => state.setUser);
  const storeUser = useAuthStore((state) => state.user);
  const { data, isError } = useCurrentUser();

  useEffect(() => {
    if (!mounted) return;
    if (!getStoredToken() || isError) {
      router.replace("/login");
      return;
    }
    if (data) {
      setUser(data);
      if (data.role !== role) {
        router.replace(data.role === "RECRUITER" ? "/recruiter" : "/candidate");
      }
    }
  }, [mounted, isError, data, role, router, setUser]);

  if (!mounted || !storeUser || storeUser.role !== role) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoadingState />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
