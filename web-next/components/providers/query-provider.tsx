'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const hertzBeatQueryDefaults = {
  queries: {
    staleTime: 5000,
    refetchOnWindowFocus: true,
    retry: 1
  }
} as const;

function createHertzBeatQueryClient() {
  return new QueryClient({
    defaultOptions: hertzBeatQueryDefaults
  });
}

export function HertzBeatQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(createHertzBeatQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
