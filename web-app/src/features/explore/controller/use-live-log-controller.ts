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
import { parseLogRow } from '../api/explore-log-schema';
import { ExploreSignalContractError, type LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import type { LiveLogStatus } from '../model/explore-signal-model';

const MAX_STREAM_ROWS = 500;
type PathState<T> = { path: string; value: T };

export function useLiveLogController(query: LogExploreQuery) {
  const path = useMemo(() => buildLogStreamPath(query), [query]);
  const [paused, setPaused] = useState(false);
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
    let source: EventSource;
    try {
      source = openLogStream(path);
    } catch {
      setStatus('error');
      return;
    }
    source.onopen = () => setStatus('connected');
    source.onerror = () => setStatus('unavailable');
    source.addEventListener('LOG_EVENT', event => {
      if (active.current !== token) return;
      try {
        const row = parseLogRow(JSON.parse((event as MessageEvent<string>).data) as unknown);
        setRowsState(current => ({
          path,
          value: [row, ...(current.path === path ? current.value : [])].slice(0, MAX_STREAM_ROWS)
        }));
      } catch (error) {
        setStatus(error instanceof ExploreSignalContractError || error instanceof SyntaxError ? 'contract' : 'error');
      }
    });
    return () => {
      if (active.current === token) active.current = undefined;
      source.close();
    };
  }, [path, paused]);

  const rows = rowsState.path === path ? rowsState.value : [];
  const status = paused ? 'paused' : statusState.path === path ? statusState.value : 'waiting';
  const togglePaused = () => {
    if (paused) setStatusState({ path, value: 'waiting' });
    setPaused(!paused);
  };
  return {
    rows,
    status,
    togglePaused,
    clear: () => setRowsState({ path, value: [] })
  };
}
