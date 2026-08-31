"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { useAuthStore } from "@/stores/auth.store";
import { getStoredToken } from "@/lib/auth/token";
import { LoadingState } from "@/components/layout/loading-state";
import type { Role } from "@/types/api";

interface RequireRoleProps {
  role: Role;
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const storeUser = useAuthStore((state) => state.user);
  const { data, isError } = useCurrentUser();
  const hasToken = !!getStoredToken();

  useEffect(() => {
    if (!hasToken || isError) {
      router.replace("/login");
      return;
    }
    if (data) {
      setUser(data);
      if (data.role !== role) {
        router.replace(data.role === "RECRUITER" ? "/recruiter" : "/candidate");
      }
    }
  }, [hasToken, isError, data, role, router, setUser]);

  if (!hasToken || isError) return null;

  if (!storeUser || storeUser.role !== role) {
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
