"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth.api";
import { getStoredToken } from "@/lib/auth/token";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then((res) => res.user),
    enabled: !!getStoredToken(),
    retry: false,
    staleTime: 5 * 60_000,
  });
}
