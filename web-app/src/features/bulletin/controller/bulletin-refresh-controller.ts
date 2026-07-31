/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useLayoutEffect, useRef } from 'react';

type Refresh = () => Promise<boolean>;

export function useBulletinRefreshController(canRead: boolean, refreshList: Refresh, refreshMetrics: Refresh) {
  const canReadRef = useRef(canRead);
  const inFlight = useRef<Promise<boolean> | null>(null);
  useLayoutEffect(() => {
    canReadRef.current = canRead;
  }, [canRead]);

  const refresh = useCallback(async () => {
    if (!canReadRef.current || inFlight.current) return false;
    const operation = Promise.all([refreshList(), refreshMetrics()]).then(results => results.every(Boolean));
    inFlight.current = operation;
    try {
      return await operation;
    } catch {
      return false;
    } finally {
      if (inFlight.current === operation) inFlight.current = null;
    }
  }, [refreshList, refreshMetrics]);

  return { refresh };
}
