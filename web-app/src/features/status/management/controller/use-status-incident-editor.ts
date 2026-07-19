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

import { useCallback, useEffect, useRef, useState } from 'react';

import { loadStatusIncident } from '../api/status-management-api';
import type { StatusIncident } from '../model/status-management-contract';

export function useStatusIncidentEditor(reportLoadFailure?: (error: unknown) => void) {
  const [incident, setIncident] = useState<StatusIncident>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const request = useRef<AbortController | undefined>(undefined);

  const invalidate = useCallback(() => {
    request.current?.abort();
    request.current = undefined;
  }, []);

  const edit = useCallback(
    (id: number) => {
      invalidate();
      const controller = new AbortController();
      request.current = controller;
      setIncident(undefined);
      setError(undefined);
      setLoading(true);

      void (async () => {
        try {
          const next = await loadStatusIncident(id, controller.signal);
          // Some transports still resolve after abort; controller identity keeps stale details closed.
          if (controller.signal.aborted || request.current !== controller) return;
          request.current = undefined;
          setIncident(next);
          setError(undefined);
          setLoading(false);
        } catch (reason) {
          if (controller.signal.aborted || request.current !== controller) return;
          request.current = undefined;
          setLoading(false);
          setError(reason);
          reportLoadFailure?.(reason);
        }
      })();
    },
    [invalidate, reportLoadFailure]
  );

  const openNew = useCallback(
    (orgId: number | undefined) => {
      invalidate();
      setLoading(false);
      setError(undefined);
      setIncident({ orgId: orgId ?? 0, name: '', state: 0, components: [], contents: [] });
    },
    [invalidate]
  );

  const close = useCallback(() => {
    invalidate();
    setLoading(false);
    setError(undefined);
    setIncident(undefined);
  }, [invalidate]);

  useEffect(() => invalidate, [invalidate]);

  return { incident, loading, error, edit, openNew, close };
}
