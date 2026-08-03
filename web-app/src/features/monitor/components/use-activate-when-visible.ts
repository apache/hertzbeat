/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef } from 'react';

/** Runs one deferred UI action when its owner approaches the viewport and keeps a non-observer fallback possible. */
export function useActivateWhenVisible<T extends Element>(
  enabled: boolean,
  activate: () => void,
  rootMargin = '200px 0px'
) {
  const target = useRef<T>(null);
  useEffect(() => {
    if (!enabled || !target.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        activate();
      },
      { rootMargin }
    );
    observer.observe(target.current);
    return () => observer.disconnect();
  }, [activate, enabled, rootMargin]);
  return target;
}
