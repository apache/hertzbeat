/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type ShellFullscreenState = {
  available: boolean;
  active: boolean;
  busy: boolean;
};

type FullscreenRuntime = {
  available: () => boolean;
  active: () => boolean;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

const browserFullscreenRuntime: FullscreenRuntime = {
  available: () => {
    const target = fullscreenDocument();
    return (
      typeof target?.documentElement.requestFullscreen === 'function' && typeof target.exitFullscreen === 'function'
    );
  },
  active: () => Boolean(fullscreenDocument()?.fullscreenElement),
  enter: async () => {
    const target = fullscreenDocument();
    if (!target?.documentElement.requestFullscreen) throw new Error('Fullscreen is unavailable');
    await target.documentElement.requestFullscreen();
  },
  exit: async () => {
    const target = fullscreenDocument();
    if (!target?.exitFullscreen) throw new Error('Fullscreen is unavailable');
    await target.exitFullscreen();
  },
  subscribe: listener => {
    const target = fullscreenDocument();
    if (!target) return () => undefined;
    target.addEventListener('fullscreenchange', listener);
    return () => target.removeEventListener('fullscreenchange', listener);
  }
};

export function useShellFullscreenAction(runtime: FullscreenRuntime = browserFullscreenRuntime) {
  const available = runtime.available();
  const [active, setActive] = useState(() => available && runtime.active());
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = runtime.subscribe(() => setActive(available && runtime.active()));
    return () => {
      mounted.current = false;
      operation.current = false;
      unsubscribe();
    };
  }, [available, runtime]);

  const toggle = useCallback(async () => {
    if (!available) return 'unavailable' as const;
    if (operation.current) return 'busy' as const;
    operation.current = true;
    setBusy(true);
    try {
      await (runtime.active() ? runtime.exit() : runtime.enter());
      if (mounted.current) setActive(runtime.active());
      return 'changed' as const;
    } catch {
      return 'error' as const;
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [available, runtime]);

  return { state: { available, active, busy }, toggle };
}

function fullscreenDocument() {
  return typeof document === 'undefined' ? undefined : document;
}
