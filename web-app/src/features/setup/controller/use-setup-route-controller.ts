/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { loadSetupStatus, SetupRequestError, unlockSetup } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import type { SetupErrorCode, SetupStatus } from '../model/setup-contract';
import { setupQueryKeys } from './setup-query-keys';
import {
  failedSetupStatusRefresh,
  successfulSetupStatusRefresh,
  type SetupStatusRefresh
} from './setup-status-refresh';
import { setupAuthorityFingerprint, setupWriteAuthority } from './setup-write-authority';
import { useSetupWriteBoundary } from './use-setup-write-boundary';

export type SetupRouteController =
  | SetupControllerBase<'loading', null>
  | SetupControllerBase<'unavailable', null>
  | SetupControllerBase<'ready', SetupStatus>;

export type SetupUnlockFailureKind = 'rejected' | 'unavailable' | 'contract' | 'error';
type SetupUnlockFailure = {
  errorCode: SetupErrorCode | null;
  kind: SetupUnlockFailureKind;
  authority: string | null;
};

type SetupControllerBase<State extends string, Status> = {
  state: State;
  status: Status;
  retry: SetupStatusRefresh;
  unlockCode: string;
  setUnlockCode: (code: string) => void;
  unlock: () => Promise<void>;
  unlockPending: boolean;
  unlockErrorCode: SetupErrorCode | null;
  unlockFailureKind: SetupUnlockFailureKind | null;
  statusRefreshFailed: boolean;
};

export function useSetupRouteController(): SetupRouteController {
  const { statusQuery, retry } = useSetupStatusController();
  const unlockController = useSetupUnlockController(statusQuery.data ?? null, retry);
  const shared = {
    retry,
    ...unlockController,
    statusRefreshFailed: Boolean(statusQuery.data && statusQuery.error)
  };

  if (statusQuery.isPending && !statusQuery.data) return { state: 'loading', status: null, ...shared };
  if (!statusQuery.data) return { state: 'unavailable', status: null, ...shared };
  return { state: 'ready', status: statusQuery.data, ...shared };
}

function useSetupStatusController() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: setupQueryKeys.status(),
    queryFn: ({ signal }) => loadSetupStatus(signal),
    staleTime: 0,
    gcTime: 0,
    retry: false
  });
  const { refetch } = statusQuery;
  const retry = useCallback(
    async (signal?: AbortSignal) => {
      const cancel = () =>
        void queryClient.cancelQueries({ queryKey: setupQueryKeys.status(), exact: true }, { revert: false });
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        const result = await refetch();
        return !signal?.aborted && result && !result.error && result.data
          ? successfulSetupStatusRefresh(result.data)
          : failedSetupStatusRefresh(result?.data ?? null);
      } finally {
        signal?.removeEventListener('abort', cancel);
      }
    },
    [queryClient, refetch]
  );
  return { statusQuery, retry };
}

function useSetupUnlockController(status: SetupStatus | null, retry: SetupStatusRefresh) {
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockPending, setUnlockPending] = useState(false);
  const unlockPendingRef = useRef(false);
  const unlockCodeRef = useRef('');
  const startWrite = useSetupWriteBoundary();
  const currentAuthority = status ? setupAuthorityFingerprint(status) : null;
  const { currentUnlockFailure, setUnlockFailure } = useCurrentUnlockFailure(currentAuthority);
  const updateUnlockCode = useCallback((code: string) => {
    unlockCodeRef.current = code;
    setUnlockCode(code);
  }, []);
  const unlock = useCallback(async () => {
    const code = unlockCodeRef.current;
    if (!code || unlockPendingRef.current) return;
    const writeAuthority = status ? setupAuthorityFingerprint(status) : null;
    const write = startWrite();
    unlockPendingRef.current = true;
    unlockCodeRef.current = '';
    setUnlockCode('');
    setUnlockPending(true);
    setUnlockFailure(null);
    try {
      await unlockSetup(code, write.signal);
      if (!write.signal.aborted) await retry();
    } catch (error) {
      const failure = await resolveUnlockFailure(error, retry, write.signal);
      if (!write.signal.aborted && failure) {
        setUnlockFailure({ ...failure, authority: writeAuthority });
      }
    } finally {
      write.release();
      unlockPendingRef.current = false;
      if (!write.signal.aborted) setUnlockPending(false);
    }
  }, [retry, setUnlockFailure, startWrite, status]);

  return {
    unlockCode,
    setUnlockCode: updateUnlockCode,
    unlock,
    unlockPending,
    unlockErrorCode: currentUnlockFailure?.errorCode ?? null,
    unlockFailureKind: currentUnlockFailure?.kind ?? null
  };
}

function useCurrentUnlockFailure(currentAuthority: string | null) {
  const [unlockFailure, setUnlockFailure] = useState<SetupUnlockFailure | null>(null);
  useEffect(() => {
    if (!unlockFailure || unlockFailure.authority === currentAuthority) return;
    const retiredFailure = unlockFailure;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Authority-scoped failures must retire after a committed authority transition.
    setUnlockFailure(current => (current === retiredFailure ? null : current));
  }, [currentAuthority, unlockFailure]);
  const currentUnlockFailure = unlockFailure?.authority === currentAuthority ? unlockFailure : null;
  return { currentUnlockFailure, setUnlockFailure };
}

async function resolveUnlockFailure(
  error: unknown,
  retry: SetupStatusRefresh,
  signal: AbortSignal
): Promise<{ errorCode: SetupErrorCode | null; kind: SetupUnlockFailureKind } | null> {
  if (signal.aborted) return null;
  if (error instanceof SetupRequestError && error.errorCode === 'setup_complete') {
    await retry();
    return null;
  }
  if (error instanceof SetupRequestError) return resolveRequestFailure(error, retry);
  const refresh = await retry();
  if (refresh.succeeded && unlockAuthorityAdvanced(refresh.status)) return null;
  return { errorCode: null, kind: error instanceof SetupContractError ? 'contract' : 'error' };
}

async function resolveRequestFailure(error: SetupRequestError, retry: SetupStatusRefresh) {
  const refresh = setupWriteAuthority(error, 'unlock') !== 'current' ? await retry() : null;
  if (refresh?.succeeded && unlockAuthorityAdvanced(refresh.status)) return null;
  return {
    errorCode: error.errorCode ?? null,
    kind: error.errorCode ? ('rejected' as const) : requestFailureKind(error)
  };
}

function unlockAuthorityAdvanced(status: SetupStatus | null) {
  return Boolean(status && (status.access !== 'locked' || status.phase === 'complete'));
}

function requestFailureKind(error: SetupRequestError) {
  if (error.kind === 'unavailable' || error.kind === 'contract') return error.kind;
  return 'error' as const;
}
