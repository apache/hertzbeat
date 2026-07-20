/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { buildLogStreamPath, openLogStream } from '../api/explore-api';
import type { LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import type { LiveLogStatus } from '../model/explore-signal-model';

const MAXIMUM_RETAINED_LIVE_LOG_ROWS = 500;
type PathState<T> = { path: string; value: T };

export function useLiveLogController(query: LogExploreQuery) {
  const path = useMemo(() => buildLogStreamPath(query), [query]);
  const [paused, setPaused] = useState(false);
  // Tag stream-owned state with its path so a query change cannot briefly expose rows from the previous stream.
  const [rowsState, setRowsState] = useState<PathState<LogRow[]>>({ path, value: [] });
  const [statusState, setStatusState] = useState<PathState<LiveLogStatus>>({ path, value: 'waiting' });
  const active = useRef<symbol | undefined>(undefined);

  useEffect(() => {
    if (paused) return;
    const token = Symbol(path);
    active.current = token;
    const setStatus = (value: LiveLogStatus) => {
      if (active.current === token) setStatusState({ path, value });
    };
    let source: { close: () => void };
    try {
      source = openLogStream(path, {
        onOpen: () => setStatus('connected'),
        onRetrying: () => setStatus('waiting'),
        onUnavailable: () => setStatus('unavailable'),
        onContractError: () => setStatus('contract'),
        onLog: row => {
          if (active.current !== token) return;
          setRowsState(current => ({
            path,
            value: [row, ...rowsForPath(current, path)].slice(0, MAXIMUM_RETAINED_LIVE_LOG_ROWS)
          }));
        }
      });
    } catch {
      setStatus('error');
      return;
    }
    return () => {
      if (active.current === token) active.current = undefined;
      source.close();
    };
  }, [path, paused]);

  const rows = rowsForPath(rowsState, path);
  const status = statusForPath(statusState, path, paused);
  const togglePaused = () => {
    const nextPaused = !paused;
    if (!nextPaused) setStatusState({ path, value: 'waiting' });
    setPaused(nextPaused);
  };
  return {
    rows,
    status,
    togglePaused,
    clear: () => setRowsState({ path, value: [] })
  };
}

function rowsForPath(state: PathState<LogRow[]>, path: string) {
  if (state.path !== path) return [];
  return state.value;
}

function statusForPath(state: PathState<LiveLogStatus>, path: string, paused: boolean): LiveLogStatus {
  if (paused) return 'paused';
  if (state.path !== path) return 'waiting';
  return state.value;
}
