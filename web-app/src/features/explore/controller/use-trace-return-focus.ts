/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
