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

import type { LogFilterFailureReason, LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';

import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';

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

type OwnedLiveLogStreamOptions = {
  path: string;
  connectionScope: string;
  evidenceScopeRef: MutableRefObject<string>;
  setConnectionState: ConnectionSetter;
  setEvidenceState: EvidenceSetter;
  token: symbol;
  ownsGeneration: (token: symbol) => boolean;
  retireGeneration: (token: symbol) => void;
};

class OwnedLiveLogStream {
  private static readonly FLUSH_INTERVAL = 200;
  private static readonly MAX_PENDING_ROWS = 1000;
  private source: { close: () => void } | undefined;
  private closed = false;
  private opened = false;
  private pendingRows: Parameters<typeof appendLogEvidence>[2][number][] = [];
  private pendingScope: string | undefined;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: OwnedLiveLogStreamOptions) {}

  connect() {
    try {
      this.source = openLogStream(this.options.path, {
        onOpen: () => this.handleOpen(),
        onRetrying: () => this.handleRetrying(),
        onUnavailable: () => this.handleUnavailable(),
        onContractError: () => this.handleContractError(),
        onInvalidFilter: (reason, diagnostic) => this.handleRejected('invalid_filter', reason, diagnostic),
        onPermission: () => this.handleRejected('permission'),
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
    this.cancelPending();
    this.source?.close();
  }

  cancelPending() {
    if (this.flushTimer !== undefined) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    this.pendingRows = [];
    this.pendingScope = undefined;
  }

  private ownsGeneration() {
    return this.options.ownsGeneration(this.options.token);
  }

  private retire() {
    this.options.retireGeneration(this.options.token);
  }

  private setStatus(
    value: LiveLogConnectionStatus,
    invalidFilterReason?: LogFilterFailureReason,
    syntaxDiagnostic?: LogSyntaxDiagnostic
  ) {
    if (this.ownsGeneration()) {
      this.options.setConnectionState({
        scope: this.options.connectionScope,
        value,
        invalidFilterReason,
        syntaxDiagnostic
      });
    }
  }

  private markDegraded(droppedCount?: number) {
    if (this.ownsGeneration()) {
      this.flushPendingRows();
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
    this.flushPendingRows();
    this.setStatus('unavailable');
    this.retire();
  }

  private handleRejected(
    status: 'invalid_filter' | 'permission',
    reason?: LogFilterFailureReason,
    diagnostic?: LogSyntaxDiagnostic
  ) {
    this.flushPendingRows();
    this.setStatus(status, reason, diagnostic);
    this.retire();
    this.close();
  }

  private handleContractError() {
    if (!this.ownsGeneration()) return;
    this.flushPendingRows();
    this.setStatus('contract');
    this.retire();
    this.close();
  }

  private handleLog(row: Parameters<typeof appendLogEvidence>[2][number]) {
    if (!this.ownsGeneration()) return;
    const scope = this.options.evidenceScopeRef.current;
    if (this.pendingScope !== undefined && this.pendingScope !== scope) this.cancelPending();
    this.pendingScope = scope;
    this.pendingRows.push(row);
    if (this.pendingRows.length >= OwnedLiveLogStream.MAX_PENDING_ROWS) {
      this.flushPendingRows();
    } else if (this.flushTimer === undefined) {
      this.flushTimer = setTimeout(() => this.flushPendingRows(), OwnedLiveLogStream.FLUSH_INTERVAL);
    }
  }

  flushPendingRows() {
    if (this.flushTimer !== undefined) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    const rows = this.pendingRows;
    const scope = this.pendingScope;
    this.pendingRows = [];
    this.pendingScope = undefined;
    if (rows.length && this.ownsGeneration() && scope === this.options.evidenceScopeRef.current) {
      this.setStatus('connected');
      appendLogEvidence(this.options.setEvidenceState, scope, rows);
    }
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
