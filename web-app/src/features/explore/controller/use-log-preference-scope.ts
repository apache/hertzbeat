/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useSession } from '@/core/auth/session-context';
import type { ExploreLogPreferenceScope } from '../model/explore-log-display-preferences';

export function useLogPreferenceScope(): ExploreLogPreferenceScope | undefined {
  const { session } = useSession();
  return session?.authenticated && session.username && session.workspaceId
    ? { workspaceId: session.workspaceId, username: session.username }
    : undefined;
}
