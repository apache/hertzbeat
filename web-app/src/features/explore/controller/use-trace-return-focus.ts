/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef } from 'react';
import { buildExplorePath, parseExploreQuery } from '../model/explore-model';
import { exploreInvestigationRoute } from '../model/explore-investigation-model';
import { traceBackgroundPath } from '../model/explore-detail-workspace-model';

export function useTraceReturnFocus(path: string, navigate: (path: string) => void) {
  const origin = useRef<{ trigger: HTMLElement; host: HTMLElement | null; background: string } | null>(null);
  useEffect(() => {
    const pending = origin.current;
    if (!pending || isTraceDetail(path)) return;
    origin.current = null;
    if (canonicalPath(path) !== pending.background) return;
    queueMicrotask(() => {
      // Do not steal focus from a user who already moved to another control.
      if (document.activeElement !== document.body) return;
      const target = pending.trigger.isConnected ? pending.trigger : pending.host;
      if (target?.isConnected) target.focus({ preventScroll: true });
    });
  }, [path]);
  return (next: string) => {
    if (!isTraceDetail(path) && isTraceDetail(next) && document.activeElement instanceof HTMLElement) {
      const trigger = document.activeElement;
      const host = trigger.closest<HTMLElement>('[data-trace-results]');
      if (host) origin.current = { trigger, host, background: traceBackgroundPath(parsePath(next)) };
    }
    navigate(next);
  };
}
function parsePath(path: string) {
  return parseExploreQuery(new URLSearchParams(path.split('?')[1]));
}
function isTraceDetail(path: string) {
  return path.split('?')[0] === '/explore' && exploreInvestigationRoute(parsePath(path)).kind === 'trace';
}
function canonicalPath(path: string) {
  return path.split('?')[0] === '/explore' ? buildExplorePath(parsePath(path)) : path;
}
