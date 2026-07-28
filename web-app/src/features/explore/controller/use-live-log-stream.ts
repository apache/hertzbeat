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

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

import { openLogStream } from '../api/explore-api';
import {
  appendLogEvidence,
  degradeEvidence,
  type ConnectionSetter,
  type EvidenceSetter,
  type LiveLogConnectionStatus
} from './use-live-log-evidence-state';

type LiveLogStreamOptions = {
  path: string;
  connectionScope: string;
  evidenceScopeRef: RefObject<string>;
  paused: boolean;
  retryRevision: number;
  setConnectionState: ConnectionSetter;
  setEvidenceState: EvidenceSetter;
};

export function useLiveLogStream(options: LiveLogStreamOptions) {
  const { path, connectionScope, evidenceScopeRef, paused, retryRevision, setConnectionState, setEvidenceState } =
    options;
  const generationBoundary = JSON.stringify([connectionScope, retryRevision, paused]);
  const { beginGeneration, ownsGeneration, retireGeneration } = useConnectionGeneration(
    connectionScope,
    generationBoundary,
    setConnectionState
  );

  useEffect(() => {
    if (paused) return;
    const token = beginGeneration(connectionScope);
    let source: { close: () => void } | undefined;
    let closed = false;
    let opened = false;
    const closeSource = () => {
      if (closed) return;
      closed = true;
      source?.close();
    };
    const setStatus = (value: LiveLogConnectionStatus) => {
      if (ownsGeneration(token)) setConnectionState({ scope: connectionScope, value });
    };
    const markDegraded = (droppedCount?: number) => {
      if (ownsGeneration(token)) degradeEvidence(setEvidenceState, evidenceScopeRef.current, droppedCount);
    };
    try {
      source = openLogStream(path, {
        onOpen: () => {
          opened = true;
          setStatus('connected');
        },
        onRetrying: () => {
          if (opened) markDegraded();
          setStatus('waiting');
        },
        onUnavailable: () => {
          setStatus('unavailable');
          retireGeneration(token);
        },
        onContractError: () => {
          if (!ownsGeneration(token)) return;
          setStatus('contract');
          retireGeneration(token);
          closeSource();
        },
        onGap: gap => markDegraded(gap.droppedCount),
        onLog: row => {
          if (!ownsGeneration(token)) return;
          setStatus('connected');
          appendLogEvidence(setEvidenceState, evidenceScopeRef.current, row);
        }
      });
      if (closed) source.close();
    } catch {
      setStatus('error');
      retireGeneration(token);
      return;
    }
    return () => {
      retireGeneration(token);
      closeSource();
    };
  }, [
    beginGeneration,
    connectionScope,
    evidenceScopeRef,
    ownsGeneration,
    path,
    paused,
    retireGeneration,
    retryRevision,
    setConnectionState,
    setEvidenceState
  ]);
}

function useConnectionGeneration(
  connectionScope: string,
  generationBoundary: string,
  setConnectionState: ConnectionSetter
) {
  const activeRef = useRef<symbol | undefined>(undefined);
  const committedBoundaryRef = useRef(generationBoundary);

  useLayoutEffect(() => {
    if (committedBoundaryRef.current === generationBoundary) return;
    activeRef.current = undefined;
    committedBoundaryRef.current = generationBoundary;
    setConnectionState({ scope: connectionScope, value: 'waiting' });
  }, [connectionScope, generationBoundary, setConnectionState]);

  const beginGeneration = useCallback((scope: string) => {
    const token = Symbol(scope);
    activeRef.current = token;
    return token;
  }, []);
  const ownsGeneration = useCallback((token: symbol) => activeRef.current === token, []);
  const retireGeneration = useCallback((token: symbol) => {
    if (activeRef.current === token) activeRef.current = undefined;
  }, []);
  return { beginGeneration, ownsGeneration, retireGeneration };
}
