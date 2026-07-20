/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { QueryClient } from '@tanstack/react-query';

import { bulletinQueryKeys } from './bulletin-query-keys';

/** Refreshes the list projection without retrying the mutation that produced it. */
export async function refreshBulletinListProjection(
  client: QueryClient,
  refresh: () => Promise<boolean>,
  isCurrent: () => boolean
) {
  try {
    // The explicit refresh below is the sole proof read; invalidation must not start a duplicate request.
    await client.invalidateQueries({ queryKey: bulletinQueryKeys.lists(), refetchType: 'none' });
    return isCurrent() && (await refresh());
  } catch {
    return false;
  }
}
