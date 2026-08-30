"use client";

import { ErrorState } from "@/components/layout/error-state";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md">
        <ErrorState message={error.message || "An unexpected error occurred."} onRetry={reset} />
      </div>
    </div>
  );
}
