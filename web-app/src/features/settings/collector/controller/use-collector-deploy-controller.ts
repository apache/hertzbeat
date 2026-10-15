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
      if (canWrite && !lifecycle.isActive()) {
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
  const invalidate = useCallback(() => {
    operationRef.current += 1;
    activeRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);
  const retire = useCallback(() => {
    invalidate();
    setState({ kind: 'closed' });
  }, [invalidate, setState]);
  const begin = useCallback(() => {
    if (activeRef.current) return null;
    operationRef.current += 1;
    activeRef.current = true;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    return { epoch: operationRef.current, signal: abort.signal };
  }, []);
  const finish = useCallback((epoch: number) => {
    if (epoch !== operationRef.current) return false;
    activeRef.current = false;
    return true;
  }, []);
  const isActive = useCallback(() => activeRef.current, []);
  useEffect(() => {
    if (!canWrite) retire();
  }, [canWrite, retire]);
  useEffect(() => () => invalidate(), [invalidate]);
  return { begin, finish, isActive, retire };
}

function useDeployExecutor(
  canWrite: boolean,
  lifecycle: ReturnType<typeof useDeployLifecycle>,
  setState: (state: CollectorDeployState) => void
) {
  const { begin, finish, isActive } = lifecycle;
  const execute = useCallback(
    async (collector: string) => {
      if (!canWrite || isActive()) return;
      let collectorId: string;
      try {
        collectorId = normalizeCollectorId(collector);
      } catch {
        return setState({ kind: 'failed', collector: collector.trim(), failure: 'validation' });
      }
      const owner = begin();
      if (!owner) return;
      setState({ kind: 'submitting', collector: collectorId });
      try {
        const deployment = await generateCollectorDeployInfo(collectorId, owner.signal);
        if (finish(owner.epoch)) {
          setState({ kind: 'ready', collector: collectorId, deployment });
        }
      } catch (error) {
        if (finish(owner.epoch)) {
          setState({ kind: 'failed', collector: collectorId, failure: deployFailure(error) });
        }
      }
    },
    [begin, canWrite, finish, isActive, setState]
  );
  return execute;
}

function deployFailure(error: unknown): CollectorDeployFailure {
  if (error instanceof CollectorDeployContractError) return 'contract';
  if (error instanceof CollectorContractError) return 'validation';
  return classifyCollectorMutationFailure(error);
}
