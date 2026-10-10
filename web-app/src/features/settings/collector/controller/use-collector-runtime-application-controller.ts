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

import { useEffect, useRef, useState } from 'react';

import type { CollectorRuntimeSaveState } from '../model/collector-runtime-report-model';
import { waitForCollectorRuntimeApplication } from './collector-runtime-report-convergence';

export function useCollectorRuntimeApplicationController() {
  const operationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<CollectorRuntimeSaveState | null>(null);
  useEffect(
    () => () => {
      operationRef.current += 1;
      abortRef.current?.abort();
    },
    []
  );
  const track = (collector: string, revision: number) => {
    const operation = ++operationRef.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setState({
      kind: 'management-saved',
      collector,
      revision,
      application: { kind: 'unknown', expectedRevision: revision, reason: 'not-reported' }
    });
    void waitForCollectorRuntimeApplication(collector, revision, { signal: abort.signal }).then(
      application => {
        if (operation !== operationRef.current) return;
        setState({ kind: 'management-saved', collector, revision, application });
      },
      () => undefined
    );
  };
  return { state, track };
}
