"use client";

import { useQueries } from "@tanstack/react-query";
import { candidatesApi } from "@/lib/api/candidates.api";
import type { Application } from "@/types/applications";

/**
 * Applications only carry a candidateId — there's no bulk "candidates for
 * these applications" endpoint, so this fans out one request per
 * application (scoped through the recruiter's own GET
 * /applications/:id/candidate) and returns a lookup by applicationId.
 * TanStack Query caches each one, so revisiting a board doesn't re-fetch.
 */
export function useCandidateNames(applications: Application[]) {
  const results = useQueries({
    queries: applications.map((application) => ({
      queryKey: ["candidate", "for-application", application.id],
      queryFn: () => candidatesApi.getForApplication(application.id),
      staleTime: 5 * 60_000,
    })),
  });

  const names = new Map<string, string>();
  applications.forEach((application, index) => {
    const name = results[index]?.data?.user.name;
    if (name) names.set(application.id, name);
  });

  return names;
}
