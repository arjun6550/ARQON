import { QueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "./apiClient";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      // Never retry 4xx (client errors); retry transient failures twice.
      retry: (count, error) => !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});
