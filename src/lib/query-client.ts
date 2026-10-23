import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

/** Don't retry auth / not-found errors — retrying won't fix them. */
function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) return false;
  return failureCount < 1;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  });
}
