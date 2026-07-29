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
    if (!stream.connect()) return;
    return () => {
      retireGeneration(token);
      stream.close();
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

type OwnedLiveLogStreamOptions = {
  path: string;
  connectionScope: string;
  evidenceScopeRef: RefObject<string>;
  setConnectionState: ConnectionSetter;
  setEvidenceState: EvidenceSetter;
  token: symbol;
  ownsGeneration: (token: symbol) => boolean;
  retireGeneration: (token: symbol) => void;
};

class OwnedLiveLogStream {
  private source: { close: () => void } | undefined;
  private closed = false;
  private opened = false;

  constructor(private readonly options: OwnedLiveLogStreamOptions) {}

  connect() {
    try {
      this.source = openLogStream(this.options.path, {
        onOpen: () => this.handleOpen(),
        onRetrying: () => this.handleRetrying(),
        onUnavailable: () => this.handleUnavailable(),
        onContractError: () => this.handleContractError(),
        onGap: gap => this.markDegraded(gap.droppedCount),
        onLog: row => this.handleLog(row)
      });
      if (this.closed) this.source.close();
      return true;
    } catch {
      this.setStatus('error');
      this.retire();
      return false;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.source?.close();
  }

  private ownsGeneration() {
    return this.options.ownsGeneration(this.options.token);
  }

  private retire() {
    this.options.retireGeneration(this.options.token);
  }

  private setStatus(value: LiveLogConnectionStatus) {
    if (this.ownsGeneration()) {
      this.options.setConnectionState({ scope: this.options.connectionScope, value });
    }
  }

  private markDegraded(droppedCount?: number) {
    if (this.ownsGeneration()) {
      degradeEvidence(this.options.setEvidenceState, this.options.evidenceScopeRef.current, droppedCount);
    }
  }

  private handleOpen() {
    this.opened = true;
    this.setStatus('connected');
  }

  private handleRetrying() {
    if (this.opened) this.markDegraded();
    this.setStatus('waiting');
  }

  private handleUnavailable() {
    this.setStatus('unavailable');
    this.retire();
  }

  private handleContractError() {
    if (!this.ownsGeneration()) return;
    this.setStatus('contract');
    this.retire();
    this.close();
  }

  private handleLog(row: Parameters<typeof appendLogEvidence>[2]) {
    if (!this.ownsGeneration()) return;
    this.setStatus('connected');
    appendLogEvidence(this.options.setEvidenceState, this.options.evidenceScopeRef.current, row);
  }
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
