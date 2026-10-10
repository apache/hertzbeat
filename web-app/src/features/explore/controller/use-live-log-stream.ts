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

import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';
import type { ConnectionSetter, EvidenceSetter } from './use-live-log-evidence-state';
import { OwnedLiveLogStream } from './owned-live-log-stream';

type LiveLogStreamOptions = {
  path: string;
  connectionScope: string;
  evidenceScopeRef: MutableRefObject<string>;
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
  const streamRef = useRef<OwnedLiveLogStream | undefined>(undefined);
  const committedEvidenceScope = useRef<string | undefined>(undefined);

  const flushPending = useCallback(() => streamRef.current?.flushPendingRows(), []);
  const cancelPending = useCallback(() => streamRef.current?.cancelPending(), []);

  useLayoutEffect(() => {
    if (committedEvidenceScope.current === undefined) {
      committedEvidenceScope.current = evidenceScopeRef.current;
      return;
    }
    if (committedEvidenceScope.current === evidenceScopeRef.current) return;
    committedEvidenceScope.current = evidenceScopeRef.current;
    cancelPending();
  });

  useEffect(() => {
    if (paused) return;
    const token = beginGeneration(connectionScope);
    const stream = new OwnedLiveLogStream({
      path,
      connectionScope,
      evidenceScopeRef,
      setConnectionState,
      setEvidenceState,
      token,
      ownsGeneration,
      retireGeneration
    });
    streamRef.current = stream;
    if (!stream.connect()) return;
    return () => {
      retireGeneration(token);
      stream.close();
      if (streamRef.current === stream) streamRef.current = undefined;
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
  return { flushPending, cancelPending };
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
