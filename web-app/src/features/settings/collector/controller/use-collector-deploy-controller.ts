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

import { CollectorDeployContractError, generateCollectorDeployInfo } from '../api/collector-deploy-api';
import { normalizeCollectorId } from '../api/collector-management-api';
import type { CollectorDeployFailure, CollectorDeployState } from '../model/collector-deploy-model';
import { CollectorContractError } from '../model/collector-model';
import { classifyCollectorMutationFailure } from './collector-mutation';

export function useCollectorDeployController({ canWrite }: { canWrite: boolean }) {
  const [state, setState] = useState<CollectorDeployState>({ kind: 'closed' });
  const lifecycle = useDeployLifecycle(canWrite, setState);
  const execute = useDeployExecutor(canWrite, lifecycle, setState);
  return {
    state,
    open: () => {
      if (canWrite && !lifecycle.activeRef.current) {
        lifecycle.retire();
        setState({ kind: 'editing', collector: '' });
      }
    },
    submit: (collector: string) =>
      state.kind === 'editing' || state.kind === 'failed' ? execute(collector) : Promise.resolve(),
    cancel: lifecycle.retire,
    close: lifecycle.retire
  };
}

function useDeployLifecycle(canWrite: boolean, setState: (state: CollectorDeployState) => void) {
  const operationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false);
  const retire = useCallback(() => {
    operationRef.current += 1;
    activeRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ kind: 'closed' });
  }, []);
  useEffect(() => {
    if (!canWrite) retire();
  }, [canWrite, retire]);
  useEffect(
    () => () => {
      operationRef.current += 1;
      abortRef.current?.abort();
    },
    []
  );
  return { operationRef, abortRef, activeRef, retire };
}

function useDeployExecutor(
  canWrite: boolean,
  lifecycle: ReturnType<typeof useDeployLifecycle>,
  setState: (state: CollectorDeployState) => void
) {
  const execute = useCallback(
    async (collector: string) => {
      if (!canWrite || lifecycle.activeRef.current) return;
      let collectorId: string;
      try {
        collectorId = normalizeCollectorId(collector);
      } catch {
        return setState({ kind: 'failed', collector: collector.trim(), failure: 'validation' });
      }
      const operation = ++lifecycle.operationRef.current;
      lifecycle.activeRef.current = true;
      lifecycle.abortRef.current?.abort();
      const abort = new AbortController();
      lifecycle.abortRef.current = abort;
      setState({ kind: 'submitting', collector: collectorId });
      try {
        const deployment = await generateCollectorDeployInfo(collectorId, abort.signal);
        if (operation === lifecycle.operationRef.current) {
          lifecycle.activeRef.current = false;
          setState({ kind: 'ready', collector: collectorId, deployment });
        }
      } catch (error) {
        if (operation === lifecycle.operationRef.current) {
          lifecycle.activeRef.current = false;
          setState({ kind: 'failed', collector: collectorId, failure: deployFailure(error) });
        }
      }
    },
    [canWrite, lifecycle, setState]
  );
  return execute;
}

function deployFailure(error: unknown): CollectorDeployFailure {
  if (error instanceof CollectorDeployContractError) return 'contract';
  if (error instanceof CollectorContractError) return 'validation';
  return classifyCollectorMutationFailure(error);
}
