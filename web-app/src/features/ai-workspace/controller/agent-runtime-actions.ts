/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback } from 'react';
import type { Dispatch } from 'react';

import { stopAgentRun } from '../api/agent-gateway-api';

type OperationRefs = {
  isMounted: () => boolean;
  getOperationGeneration: () => number;
};

export function useStopAgentRun(
  runUid: string | undefined,
  stopping: boolean,
  refs: OperationRefs,
  setStopping: Dispatch<React.SetStateAction<boolean>>,
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>
) {
  return useCallback(async () => {
    if (!runUid || stopping) return;
    const generation = refs.getOperationGeneration();
    setStopping(true);
    try {
      await stopAgentRun(runUid);
    } catch {
      if (currentOperation(refs, generation)) setFailure('unavailable');
    } finally {
      if (currentOperation(refs, generation)) setStopping(false);
    }
  }, [refs, runUid, setFailure, setStopping, stopping]);
}

export function useSafeAgentAction<T extends unknown[]>(
  action: (...args: T) => Promise<unknown>,
  refs: OperationRefs,
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>
) {
  return useCallback(
    async (...args: T) => {
      const generation = refs.getOperationGeneration();
      try {
        await action(...args);
      } catch {
        if (currentOperation(refs, generation)) setFailure('unavailable');
      }
    },
    [action, refs, setFailure]
  );
}

function currentOperation(refs: OperationRefs, generation: number) {
  return refs.isMounted() && refs.getOperationGeneration() === generation;
}
