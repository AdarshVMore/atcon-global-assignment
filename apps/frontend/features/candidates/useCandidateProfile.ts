"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { candidatesApi } from "@/lib/api/candidates.api";

export function useCandidateProfile() {
  return useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: candidatesApi.getProfile,
  });
}

export function useUpdateCandidateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phone: string) => candidatesApi.updateProfile(phone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", "profile"] }),
  });
}

export function useResumes() {
  return useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: () => candidatesApi.listResumes().then((res) => res.resumes),
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === "PROCESSING" || r.status === "UPLOADED") ? 3000 : false),
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => candidatesApi.uploadResume(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] }),
  });
}
