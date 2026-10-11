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

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { loadStatusIncident } from '../api/status-management-api';
import type { StatusIncident } from '../model/status-management-contract';
import { createStatusIncidentDraft } from '../model/status-management-model';
import { requireStatusExactId } from './status-management-canonical-proof';

type IncidentEditorView = { incident?: StatusIncident; loading: boolean; error?: unknown };
type DetailRequest = {
  id: number;
  controller: AbortController;
  current: React.MutableRefObject<AbortController | undefined>;
  setView: Dispatch<SetStateAction<IncidentEditorView>>;
  reportLoadFailure: ((error: unknown) => void) | undefined;
};

export function useStatusIncidentEditor(command: ExclusiveOperation, reportLoadFailure?: (error: unknown) => void) {
  const [view, setView] = useState<IncidentEditorView>({ loading: false });
  const request = useRef<AbortController | undefined>(undefined);
  const epoch = useRef(0);
  const invalidate = useCallback(() => {
    request.current?.abort();
    request.current = undefined;
  }, []);
  const edit = useCallback(
    (id: number) => {
      if (command.isLocked()) return;
      invalidate();
      epoch.current += 1;
      const controller = new AbortController();
      request.current = controller;
      setView({ loading: true });
      void loadDetail({ id, controller, current: request, setView, reportLoadFailure });
    },
    [command, invalidate, reportLoadFailure]
  );
  const openNew = useCallback(
    (orgId: number) => {
      const incident = createStatusIncidentDraft(orgId);
      if (!incident || command.isLocked()) return;
      invalidate();
      epoch.current += 1;
      setView({ loading: false, incident });
    },
    [command, invalidate]
  );
  const close = useCallback(() => {
    if (command.isLocked()) return;
    invalidate();
    epoch.current += 1;
    setView({ loading: false });
  }, [command, invalidate]);
  const complete = useCallback(
    (expectedEpoch: number) => {
      if (epoch.current !== expectedEpoch) return;
      invalidate();
      setView({ loading: false });
    },
    [invalidate]
  );
  const retireDetail = useCallback(() => {
    invalidate();
    setView(current => ({ ...current, loading: false, error: undefined }));
  }, [invalidate]);
  const retire = useCallback(() => {
    invalidate();
    epoch.current += 1;
    setView({ loading: false });
  }, [invalidate]);
  useEffect(() => invalidate, [invalidate]);
  return { ...view, edit, openNew, close, complete, retire, retireDetail, currentEpoch: () => epoch.current };
}

async function loadDetail(request: DetailRequest) {
  try {
    const next = await loadStatusIncident(request.id, request.controller.signal);
    // Some transports still resolve after abort; controller identity keeps stale details closed.
    if (!isCurrentRequest(request)) return;
    requireStatusExactId(next.id, request.id);
    request.current.current = undefined;
    request.setView({ incident: next, loading: false });
  } catch (error) {
    if (!isCurrentRequest(request)) return;
    request.current.current = undefined;
    request.setView({ loading: false, error });
    request.reportLoadFailure?.(error);
  }
}

function isCurrentRequest(request: DetailRequest) {
  return !request.controller.signal.aborted && request.current.current === request.controller;
}
