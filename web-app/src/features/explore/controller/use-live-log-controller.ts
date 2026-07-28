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

import { useMemo, useState } from 'react';

import type { UiSession } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';

import { buildLogStreamPath } from '../api/explore-api';
import { exploreEvidenceScopeKey, type LogExploreQuery } from '../model/explore-model';
import { evidenceForScope, liveLogStatus, useScopedLiveLogState, valueForScope } from './use-live-log-evidence-state';
import { useLiveLogStream } from './use-live-log-stream';

export function useLiveLogController(query: LogExploreQuery) {
  const { session } = useSession();
  const path = useMemo(() => buildLogStreamPath(query), [query]);
  const sessionIdentity = liveLogSessionIdentity(session);
  const evidenceScope = JSON.stringify([sessionIdentity, exploreEvidenceScopeKey(query)]);
  const connectionScope = JSON.stringify([sessionIdentity, path]);
  const [paused, setPaused] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);
  const { evidenceState, setEvidenceState, connectionState, setConnectionState, evidenceScopeRef } =
    useScopedLiveLogState(evidenceScope, connectionScope);
  useLiveLogStream({
    path,
    connectionScope,
    evidenceScopeRef,
    paused,
    retryRevision,
    setConnectionState,
    setEvidenceState
  });

  const evidence = evidenceForScope(evidenceState, evidenceScope);
  const connectionStatus = valueForScope(connectionState, connectionScope, 'waiting');
  const status = liveLogStatus(connectionStatus, evidence.integrity, paused);
  const togglePaused = () => {
    const nextPaused = !paused;
    if (nextPaused)
      setEvidenceState(current => {
        const currentEvidence = evidenceForScope(current, evidenceScope);
        return {
          scope: evidenceScope,
          rows: currentEvidence.rows,
          integrity: 'degraded',
          gapDroppedCount: currentEvidence.gapDroppedCount,
          gapCountOverflowed: currentEvidence.gapCountOverflowed
        };
      });
    if (!nextPaused) setConnectionState({ scope: connectionScope, value: 'waiting' });
    setPaused(nextPaused);
  };
  return {
    rows: evidence.rows,
    status,
    gapDroppedCount: evidence.gapDroppedCount,
    togglePaused,
    retry: () => {
      setEvidenceState({
        scope: evidenceScope,
        rows: [],
        integrity: 'complete',
        gapDroppedCount: undefined,
        gapCountOverflowed: false
      });
      setConnectionState({ scope: connectionScope, value: 'waiting' });
      setRetryRevision(current => current + 1);
    },
    clear: () => setEvidenceState({ scope: evidenceScope, ...evidence, rows: [] })
  };
}

function liveLogSessionIdentity(session: UiSession | undefined) {
  return session
    ? [session.authenticated, session.username, session.workspaceId, [...session.roles].sort()]
    : ['session-loading'];
}
