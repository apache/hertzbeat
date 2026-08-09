/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useLayoutEffect, useRef } from 'react';

export function useDeploymentWriteBoundary(operationId: string | null) {
  const active = useRef(new Set<AbortController>());
  const epoch = useRef(0);
  const retire = useCallback(() => {
    epoch.current += 1;
    active.current.forEach(controller => controller.abort());
    active.current.clear();
  }, []);
  useLayoutEffect(() => {
    retire();
    return retire;
  }, [operationId, retire]);
  const startWrite = useCallback(() => {
    const controller = new AbortController();
    const writeEpoch = ++epoch.current;
    active.current.add(controller);
    return {
      epoch: writeEpoch,
      signal: controller.signal,
      release: () => epoch.current === writeEpoch && active.current.delete(controller)
    };
  }, []);
  const currentEpoch = useCallback(() => epoch.current, []);
  return { startWrite, currentEpoch };
}
