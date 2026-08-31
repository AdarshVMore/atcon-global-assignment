"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi, type RegisterInput } from "@/lib/api/auth.api";
import { setStoredToken } from "@/lib/auth/token";
import { useAuthStore } from "@/stores/auth.store";

export function useRegister() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: ({ user, token }) => {
      setStoredToken(token);
      setUser(user);
      router.push(user.role === "RECRUITER" ? "/recruiter" : "/candidate");
    },
  });
}
