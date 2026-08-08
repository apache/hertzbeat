/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useRef } from 'react';

export type SetupWriteBoundary = () => {
  signal: AbortSignal;
  release: () => boolean;
};

export function useSetupWriteBoundary(): SetupWriteBoundary {
  const active = useRef(new Set<AbortController>());
  useEffect(
    () => () => {
      active.current.forEach(controller => controller.abort());
      active.current.clear();
    },
    []
  );
  return useCallback(() => {
    const controller = new AbortController();
    active.current.add(controller);
    return { signal: controller.signal, release: () => active.current.delete(controller) };
  }, []);
}
