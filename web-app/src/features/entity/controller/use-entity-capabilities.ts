/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { entityCapabilities } from '../model/entity-capability-model';

export function useEntityCapabilities() {
  return entityCapabilities(useSession().session?.roles ?? []);
}

/**
 * Gives each admitted write an authority generation. Losing write access retires
 * local draft state and makes late callbacks inert; it cannot revoke a request
 * that the server has already accepted.
 */
export function useEntityWriteBoundary(canWrite: boolean, retire: () => void) {
  const authorized = useRef(canWrite);
  const generation = useRef(0);
  const previous = useRef(canWrite);
  const retireRef = useRef(retire);

  useLayoutEffect(() => {
    retireRef.current = retire;
  });
  useLayoutEffect(() => {
    const lostAccess = previous.current && !canWrite;
    authorized.current = canWrite;
    previous.current = canWrite;
    if (!lostAccess) return;
    generation.current += 1;
    retireRef.current();
  }, [canWrite]);
  useEffect(
    () => () => {
      authorized.current = false;
      generation.current += 1;
    },
    []
  );

  return {
    admit: () => (authorized.current ? generation.current : undefined),
    current: (owner: number) => authorized.current && generation.current === owner
  };
}
