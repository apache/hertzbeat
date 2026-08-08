/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { loadSetupStatus, SetupRequestError, unlockSetup } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import type { SetupErrorCode, SetupStatus } from '../model/setup-contract';
import { setupQueryKeys } from './setup-query-keys';

export type SetupRouteController =
  | SetupControllerBase<'loading', null>
  | SetupControllerBase<'unavailable', null>
  | SetupControllerBase<'ready', SetupStatus>;

export type SetupUnlockFailureKind = 'rejected' | 'unavailable' | 'contract' | 'error';

type SetupControllerBase<State extends string, Status> = {
  state: State;
  status: Status;
  retry: () => void;
  unlockCode: string;
  setUnlockCode: (code: string) => void;
  unlock: () => Promise<void>;
  unlockPending: boolean;
  unlockErrorCode: SetupErrorCode | null;
  unlockFailureKind: SetupUnlockFailureKind | null;
  statusRefreshFailed: boolean;
};

export function useSetupRouteController(): SetupRouteController {
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockErrorCode, setUnlockErrorCode] = useState<SetupErrorCode | null>(null);
  const [unlockFailureKind, setUnlockFailureKind] = useState<SetupUnlockFailureKind | null>(null);
  const [unlockPending, setUnlockPending] = useState(false);
  const unlockPendingRef = useRef(false);
  const statusQuery = useQuery({
    queryKey: setupQueryKeys.status(),
    queryFn: ({ signal }) => loadSetupStatus(signal),
    staleTime: 0,
    gcTime: 0,
    retry: false
  });
  const { refetch } = statusQuery;
  const retry = useCallback(async () => {
    await refetch();
  }, [refetch]);
  const unlock = useCallback(async () => {
    if (!unlockCode || unlockPendingRef.current) return;
    unlockPendingRef.current = true;
    setUnlockPending(true);
    setUnlockErrorCode(null);
    setUnlockFailureKind(null);
    try {
      await unlockSetup(unlockCode);
      await refetch();
    } catch (error) {
      if (error instanceof SetupRequestError && error.errorCode === 'setup_complete') {
        await refetch();
      } else if (error instanceof SetupRequestError) {
        setUnlockErrorCode(error.errorCode ?? null);
        setUnlockFailureKind(error.errorCode ? 'rejected' : requestFailureKind(error));
      } else if (error instanceof SetupContractError) {
        setUnlockFailureKind('contract');
      } else {
        setUnlockFailureKind('error');
      }
    } finally {
      // The one-time code is deliberately retired at the request boundary.
      setUnlockCode('');
      unlockPendingRef.current = false;
      setUnlockPending(false);
    }
  }, [refetch, unlockCode]);
  const shared = {
    retry,
    unlockCode,
    setUnlockCode,
    unlock,
    unlockPending,
    unlockErrorCode,
    unlockFailureKind,
    statusRefreshFailed: Boolean(statusQuery.data && statusQuery.error)
  };

  if (statusQuery.isPending && !statusQuery.data) return { state: 'loading', status: null, ...shared };
  if (!statusQuery.data) return { state: 'unavailable', status: null, ...shared };
  return { state: 'ready', status: statusQuery.data, ...shared };
}

function requestFailureKind(error: SetupRequestError) {
  if (error.kind === 'unavailable' || error.kind === 'contract') return error.kind;
  return 'error' as const;
}
